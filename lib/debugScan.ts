import { ScanObject, ScanRow, Vec3 } from './scan';

// UIの見た目確認用。Supabase/Jetsonを通さず public/sample-scan/pointcloud.ply を直接表示する。
export const DEBUG_SCAN_ID = 'debug';

function buildDebugTrajectory(): Vec3[] {
  const points: Vec3[] = [];
  const radius = 2.2;
  const height = 0.6;
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    points.push({
      x: Math.cos(angle) * radius,
      y: height,
      z: Math.sin(angle) * radius,
    });
  }
  return points;
}

export const DEBUG_SCAN: ScanRow = {
  id: DEBUG_SCAN_ID,
  user_id: 'debug-user',
  company_id: 'debug-company',
  jetson_scan_id: null,
  status: 'done',
  error_message: null,
  pointcloud_url: '/sample-scan/pointcloud.ply',
  camera_trajectory: buildDebugTrajectory(),
  video_url: null,
  created_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
};

export const DEBUG_SCAN_OBJECTS: ScanObject[] = [
  { id: 'debug-1', label: 'apple', position: { x: 0.6, y: 0.5, z: 0.2 }, confidence: 0.92, viewCount: 3 },
  { id: 'debug-2', label: 'apple', position: { x: -0.4, y: 0.6, z: -0.1 }, confidence: 0.87, viewCount: 2 },
  { id: 'debug-3', label: 'apple', position: { x: 0.1, y: 0.3, z: 0.35 }, confidence: 0.65, viewCount: 1 },
  { id: 'debug-4', label: 'leaf', position: { x: -0.8, y: 0.7, z: 0.05 }, confidence: 0.78, viewCount: 2 },
];
