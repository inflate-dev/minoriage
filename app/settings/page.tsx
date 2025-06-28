'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { toast } from 'sonner';
import { 
  Bell, 
  Camera, 
  Smartphone, 
  Database, 
  Shield, 
  Palette,
  Volume2,
  Wifi,
  Battery,
  Save
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [autoDetection, setAutoDetection] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [highQuality, setHighQuality] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [detectionThreshold, setDetectionThreshold] = useState('0.8');
  const [maxDetections, setMaxDetections] = useState('50');

  const handleSaveSettings = () => {
    // Here you would save settings to database or local storage
    toast.success('設定を保存しました');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">設定</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Detection Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Camera className="w-5 h-5 mr-2 text-blue-600" />
                <CardTitle>検出設定</CardTitle>
              </div>
              <CardDescription>
                パン検出機能の動作設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">自動検出</Label>
                  <div className="text-sm text-gray-600">
                    撮影後に自動的に検出を開始
                  </div>
                </div>
                <Switch
                  checked={autoDetection}
                  onCheckedChange={setAutoDetection}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">高画質モード</Label>
                  <div className="text-sm text-gray-600">
                    より正確な検出のため高解像度で撮影
                  </div>
                </div>
                <Switch
                  checked={highQuality}
                  onCheckedChange={setHighQuality}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">検出閾値</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={detectionThreshold}
                  onChange={(e) => setDetectionThreshold(e.target.value)}
                  className="w-full"
                />
                <div className="text-sm text-gray-600">
                  検出の信頼度閾値（0.1-1.0）
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxDetections">最大検出数</Label>
                <Input
                  id="maxDetections"
                  type="number"
                  min="1"
                  max="100"
                  value={maxDetections}
                  onChange={(e) => setMaxDetections(e.target.value)}
                  className="w-full"
                />
                <div className="text-sm text-gray-600">
                  1回の検出で処理する最大オブジェクト数
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Database className="w-5 h-5 mr-2 text-green-600" />
                <CardTitle>データ設定</CardTitle>
              </div>
              <CardDescription>
                データの保存と同期設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">自動保存</Label>
                  <div className="text-sm text-gray-600">
                    検出結果を自動的にデータベースに保存
                  </div>
                </div>
                <Switch
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Bell className="w-5 h-5 mr-2 text-orange-600" />
                <CardTitle>通知設定</CardTitle>
              </div>
              <CardDescription>
                アプリの通知とアラート設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">プッシュ通知</Label>
                  <div className="text-sm text-gray-600">
                    重要な更新やアラートを受信
                  </div>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">音声通知</Label>
                  <div className="text-sm text-gray-600">
                    検出完了時に音で通知
                  </div>
                </div>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Smartphone className="w-5 h-5 mr-2 text-purple-600" />
                <CardTitle>システム情報</CardTitle>
              </div>
              <CardDescription>
                アプリとデバイスの状態
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-sm">接続状態: 良好</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Battery className="w-4 h-4 text-green-500" />
                  <span className="text-sm">バッテリー: 85%</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2 text-sm text-gray-600">
                <div>アプリバージョン: 1.0.0</div>
                <div>最終同期: 2分前</div>
                <div>ストレージ使用量: 2.3GB / 64GB</div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-center">
            <Button onClick={handleSaveSettings} size="lg" className="w-full max-w-md">
              <Save className="w-4 h-4 mr-2" />
              設定を保存
            </Button>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}