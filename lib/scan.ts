import { supabase } from '@/lib/supabase';

const SERVER_URL = process.env.NEXT_PUBLIC_LOCAL_SERVER_URL;
const JETSON_API_KEY = process.env.NEXT_PUBLIC_JETSON_API_KEY;

export type ScanStatus = 'uploading' | 'processing' | 'done' | 'failed';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ScanRow {
  id: string;
  user_id: string;
  company_id: string;
  jetson_scan_id: string | null;
  status: ScanStatus;
  error_message: string | null;
  pointcloud_url: string | null;
  camera_trajectory: Vec3[] | null;
  video_url: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ScanObject {
  id: string;
  label: string;
  position: Vec3;
  confidence: number | null;
  // 何台のカメラ視点からこの対象物が確認できたか（doc/spec.md 9章）
  viewCount: number;
}

interface ScanStatusResponse {
  status: ScanStatus;
  stage?: string;
  error?: string;
}

interface ScanResultResponse {
  scan_id: string;
  pointcloud_url: string;
  camera_trajectory: Vec3[];
  objects: {
    id: string;
    label: string;
    position: Vec3;
    confidence: number;
    view_count: number;
  }[];
  summary: Record<string, number>;
}

function jetsonHeaders(): HeadersInit {
  return JETSON_API_KEY ? { Authorization: `Bearer ${JETSON_API_KEY}` } : {};
}

// MediaRecorderの実際の出力コーデックに応じた拡張子を選ぶ。
// 録画側はブラウザによってmp4/webmのどちらかにフォールバックするため、
// 拡張子を'.mp4'に固定するとwebmのバイナリに誤ったコンテナ拡張子を付けてしまう
function fileExtensionFor(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('webm')) return 'webm';
  return 'bin';
}

export interface UploadHandle {
  promise: Promise<{ jetsonScanId: string }>;
  abort: () => void;
}

// 動画をJetsonにアップロードし、受付IDを取得する（doc/spec.md 9章）
// XHRを使うことで、アップロード進捗の取得と途中キャンセル（電波不良時の対策）を可能にしている
export function uploadScanVideo(
  video: Blob,
  userId: string,
  companyId: string,
  onProgress?: (fraction: number) => void
): UploadHandle {
  const formData = new FormData();
  const filename = `scan.${fileExtensionFor(video.type)}`;
  formData.append('video', video, filename);
  formData.append('user', userId);
  formData.append('company', companyId);

  const xhr = new XMLHttpRequest();

  const promise = new Promise<{ jetsonScanId: string }>((resolve, reject) => {
    xhr.open('POST', `${SERVER_URL}/scan/upload`);

    const headers = jetsonHeaders() as Record<string, string>;
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ jetsonScanId: data.scan_id });
        } catch {
          reject(new Error('Failed to parse scan upload response'));
        }
      } else {
        reject(new Error(`Failed to upload scan video (status ${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Failed to upload scan video (network error)'));
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));

    xhr.send(formData);
  });

  return { promise, abort: () => xhr.abort() };
}

export async function fetchScanStatus(jetsonScanId: string): Promise<ScanStatusResponse> {
  const res = await fetch(`${SERVER_URL}/scan/status/${jetsonScanId}`, {
    headers: jetsonHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch scan status (status ${res.status})`);
  }

  return res.json();
}

export async function fetchScanResult(jetsonScanId: string): Promise<ScanResultResponse> {
  const res = await fetch(`${SERVER_URL}/scan/result/${jetsonScanId}`, {
    headers: jetsonHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch scan result (status ${res.status})`);
  }

  return res.json();
}

export async function createScanRecord(
  userId: string,
  companyId: string,
  jetsonScanId: string
): Promise<ScanRow> {
  const { data, error } = await supabase
    .from('scans')
    .insert([
      {
        user_id: userId,
        company_id: companyId,
        jetson_scan_id: jetsonScanId,
        status: 'processing',
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create scan record');
  }

  return data as ScanRow;
}

export async function markScanDone(
  scanId: string,
  pointcloudUrl: string,
  cameraTrajectory: Vec3[]
): Promise<void> {
  const { error } = await supabase
    .from('scans')
    .update({
      status: 'done',
      pointcloud_url: pointcloudUrl,
      camera_trajectory: cameraTrajectory,
      completed_at: new Date().toISOString(),
    })
    .eq('id', scanId);

  if (error) throw new Error(error.message);
}

export async function markScanFailed(scanId: string, errorMessage: string): Promise<void> {
  const { error } = await supabase
    .from('scans')
    .update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', scanId);

  if (error) throw new Error(error.message);
}

export async function insertScanObjects(
  scanId: string,
  objects: ScanResultResponse['objects']
): Promise<void> {
  if (objects.length === 0) return;

  const rows = objects.map((obj) => ({
    scan_id: scanId,
    label: obj.label,
    position_x: obj.position.x,
    position_y: obj.position.y,
    position_z: obj.position.z,
    confidence: obj.confidence,
    view_count: obj.view_count,
  }));

  const { error } = await supabase.from('scan_objects').insert(rows);
  if (error) throw new Error(error.message);
}

export async function listScans(userId: string): Promise<ScanRow[]> {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as ScanRow[];
}

export async function getScan(scanId: string): Promise<ScanRow> {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .single();

  if (error || !data) throw new Error(error?.message || 'Scan not found');
  return data as ScanRow;
}

export async function getScanObjects(scanId: string): Promise<ScanObject[]> {
  const { data, error } = await supabase
    .from('scan_objects')
    .select('*')
    .eq('scan_id', scanId);

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
    id: row.id,
    label: row.label,
    position: { x: row.position_x, y: row.position_y, z: row.position_z },
    confidence: row.confidence,
    viewCount: row.view_count ?? 1,
  }));
}
