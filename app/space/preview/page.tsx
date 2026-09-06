'use client';

// ダミーデータで3D空間ビューの表示だけを確認するための検証用ページ。
// Supabase/Jetsonには一切アクセスせず、ScanViewerコンポーネント単体を確認する。
// 確認が終わったら削除して問題ない。

import { Card, CardContent } from '@/components/ui/card';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { ScanViewer } from '@/components/ScanViewer';
import type { ScanObject, Vec3 } from '@/lib/scan';

const DUMMY_OBJECTS: ScanObject[] = [
  { id: '1', label: 'kaki', position: { x: -0.7, y: 0.6, z: 0.1 }, confidence: 0.93, viewCount: 3 },
  { id: '2', label: 'kaki', position: { x: -0.2, y: 0.5, z: -0.2 }, confidence: 0.89, viewCount: 2 },
  { id: '3', label: 'kaki', position: { x: 0.3, y: 0.7, z: 0.15 }, confidence: 0.95, viewCount: 3 },
  { id: '4', label: 'kaki', position: { x: 0.8, y: 0.4, z: -0.1 }, confidence: 0.72, viewCount: 1 },
  { id: '5', label: 'kaki', position: { x: -0.9, y: 0.3, z: 0.3 }, confidence: 0.68, viewCount: 1 },
  { id: '6', label: 'kaki', position: { x: 0.1, y: 0.35, z: 0.4 }, confidence: 0.75, viewCount: 1 },
  { id: '7', label: 'kaki', position: { x: 0.6, y: 0.65, z: 0.35 }, confidence: 0.7, viewCount: 1 },
];

function buildDummyTrajectory(): Vec3[] {
  const points: Vec3[] = [];
  const count = 36;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    points.push({
      x: (t - 0.5) * 2.6,
      y: -0.6 + Math.sin(t * Math.PI * 4) * 0.08,
      z: 0.9,
    });
  }
  return points;
}

const DUMMY_TRAJECTORY = buildDummyTrajectory();

export default function ScanViewerPreviewPage() {
  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-4 text-white">
          <h1 className="text-lg font-bold">3D空間ビュー プレビュー（ダミーデータ）</h1>
          <p className="text-sm text-gray-400">
            Supabase/Jetsonには接続していません。ScanViewerの見た目・操作確認用です。
          </p>
        </div>
        <Card className="border-gray-800">
          <CardContent className="p-0">
            <div className="h-[80vh] rounded-lg overflow-hidden">
              <ScanViewer
                pointcloudUrl="/sample-scan/pointcloud.ply"
                objects={DUMMY_OBJECTS}
                cameraTrajectory={DUMMY_TRAJECTORY}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      <BottomNavigation />
    </div>
  );
}
