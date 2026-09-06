'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ScanViewer } from '@/components/ScanViewer';
import { toast } from 'sonner';
import { Box, Loader2, AlertTriangle, ChevronLeft, Camera } from 'lucide-react';
import {
  ScanRow,
  ScanObject,
  fetchScanStatus,
  fetchScanResult,
  insertScanObjects,
  markScanDone,
  markScanFailed,
  listScans,
  getScan,
  getScanObjects,
} from '@/lib/scan';
import { DEBUG_SCAN, DEBUG_SCAN_ID, DEBUG_SCAN_OBJECTS } from '@/lib/debugScan';

const POLL_INTERVAL_MS = 12000;
const DEBUG_MODE = process.env.NODE_ENV === 'development';

function statusBadgeClass(status: ScanRow['status']) {
  switch (status) {
    case 'done':
      return 'bg-green-100 text-green-700';
    case 'failed':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-yellow-100 text-yellow-700';
  }
}

function SpacePageContent() {
  const t = useTranslations('space');
  const router = useRouter();
  const searchParams = useSearchParams();
  const scanId = searchParams.get('scan');
  const { user, setUser } = useAppStore();

  useEffect(() => {
    const getSessionUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);
    };
    getSessionUser();
  }, [setUser]);

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="p-2 bg-blue-950 rounded-lg mr-3">
                <Box className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {scanId ? (
          <ScanDetail scanId={scanId} onBack={() => router.push('/space')} />
        ) : (
          <ScanHistory userId={user?.id} />
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}

function ScanHistory({ userId }: { userId?: string }) {
  const t = useTranslations('space');
  const router = useRouter();
  const [scans, setScans] = useState<ScanRow[] | null>(null);

  useEffect(() => {
    if (!userId) return;
    listScans(userId)
      .then(setScans)
      .catch((err) => {
        console.error(err);
        toast.error(t('loadError'));
      });
  }, [userId, t]);

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('historyTitle')}</h2>
        </div>
        <div className="flex gap-2">
          {DEBUG_MODE && (
            <Button
              variant="outline"
              onClick={() => router.push(`/space?scan=${DEBUG_SCAN_ID}`)}
            >
              {t('debugBtn')}
            </Button>
          )}
          <Button onClick={() => router.push('/camera')}>
            <Camera className="w-4 h-4 mr-2" />
            {t('newScanBtn')}
          </Button>
        </div>
      </div>

      {scans === null ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      ) : scans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">{t('noHistory')}</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scans.map((scan) => (
            <Card
              key={scan.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/space?scan=${scan.id}`)}
            >
              <CardContent className="py-4 flex items-center justify-between">
                <span className="text-gray-700">
                  {new Date(scan.created_at).toLocaleString()}
                </span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadgeClass(scan.status)}`}>
                  {t(`status.${scan.status}`)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ScanDetail({ scanId, onBack }: { scanId: string; onBack: () => void }) {
  const t = useTranslations('space');
  const [scan, setScan] = useState<ScanRow | null>(null);
  const [objects, setObjects] = useState<ScanObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初回ロード
  useEffect(() => {
    if (scanId === DEBUG_SCAN_ID) {
      setScan(DEBUG_SCAN);
      setObjects(DEBUG_SCAN_OBJECTS);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getScan(scanId)
      .then(async (s) => {
        if (cancelled) return;
        setScan(s);
        if (s.status === 'done') {
          const objs = await getScanObjects(scanId);
          if (!cancelled) setObjects(objs);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error(t('loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scanId, t]);

  // ポーリング（doc/spec.md 9章：処理完了までstatusを定期確認する）
  useEffect(() => {
    if (!scan) return;
    if (scan.status !== 'uploading' && scan.status !== 'processing') return;
    if (!scan.jetson_scan_id) return;

    let cancelled = false;
    const jetsonScanId = scan.jetson_scan_id;

    const poll = async () => {
      try {
        const statusRes = await fetchScanStatus(jetsonScanId);
        if (cancelled) return;

        if (statusRes.status === 'done') {
          const result = await fetchScanResult(jetsonScanId);
          await insertScanObjects(scan.id, result.objects);
          await markScanDone(scan.id, result.pointcloud_url, result.camera_trajectory);
          if (cancelled) return;
          const [updated, objs] = await Promise.all([getScan(scan.id), getScanObjects(scan.id)]);
          setScan(updated);
          setObjects(objs);
          return;
        }

        if (statusRes.status === 'failed') {
          await markScanFailed(scan.id, statusRes.error || 'Unknown error');
          if (cancelled) return;
          setScan(await getScan(scan.id));
          return;
        }

        setStage(statusRes.stage ?? null);
        timeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err) {
        console.error('Scan status polling failed:', err);
        if (!cancelled) timeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [scan]);

  if (loading || !scan) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  const summary = objects.reduce<Record<string, number>>((acc, obj) => {
    acc[obj.label] = (acc[obj.label] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 mb-4 text-sm">
        <ChevronLeft className="w-4 h-4 mr-1" />
        {t('backToHistory')}
      </button>

      {(scan.status === 'uploading' || scan.status === 'processing') && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-950 mb-4" />
            <p className="text-gray-700 font-medium">{t('processingTitle')}</p>
            {stage && <p className="text-sm text-gray-500 mt-1">{stage}</p>}
            <p className="text-sm text-gray-500 mt-2">{t('processingHint')}</p>
          </CardContent>
        </Card>
      )}

      {scan.status === 'failed' && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mb-4" />
            <p className="text-gray-900 font-medium">{t('errorTitle')}</p>
            {scan.error_message && (
              <p className="text-sm text-gray-500 mt-2">{scan.error_message}</p>
            )}
          </CardContent>
        </Card>
      )}

      {scan.status === 'done' && scan.pointcloud_url && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-0">
              <div className="h-[70vh] rounded-lg overflow-hidden">
                <ScanViewer
                  pointcloudUrl={scan.pointcloud_url}
                  objects={objects}
                  cameraTrajectory={scan.camera_trajectory || []}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('objectsTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead className="text-gray-600 border-b">
                  <tr>
                    <th>{t('objectLabel')}</th>
                    <th className="text-center">{t('objectCount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary).map(([label, count]) => (
                    <tr key={label} className="bg-gray-50 hover:bg-gray-100 rounded">
                      <td className="px-2 py-2 font-medium">{label}</td>
                      <td className="text-center">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function SpacePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50" />}>
      <SpacePageContent />
    </Suspense>
  );
}
