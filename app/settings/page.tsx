'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Settings } from 'lucide-react';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { toast } from 'sonner';
import {
  Camera,
  Smartphone,
  Database,
  Wifi,
  Battery,
  Save
} from 'lucide-react';

export default function SettingsPage() {
  const t = useTranslations('settings')
  const [highQuality, setHighQuality] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [detectionThreshold, setDetectionThreshold] = useState('0.8');
  const [maxDetections, setMaxDetections] = useState('50');
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [connectionType, setConnectionType] = useState('wifi');
  const [storageUsage, setStorageUsage] = useState('0MB / 0MB');

  const handleSaveSettings = () => {
    // Here you would save settings to database or local storage
    toast.success(t('saveSuccess'));
  };

  useEffect(() => {
    // Fetch battery level
    (navigator as any).getBattery?.().then((battery: any) => {
      const level = Math.floor(battery.level * 100);
      (level == null || level < 0 || level > 100) ? setBatteryLevel(100) :  setBatteryLevel(level);
    });

    // Get connection type
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (connection) {
      setConnectionType(connection.effectiveType); // 例: '4g', 'wifi'
    }

    // Estimate storage usage
    navigator.storage?.estimate().then(({ usage, quota }) => {
      if (usage !== undefined && quota !== undefined) {
        const used = (usage / 1024 / 1024).toFixed(1);
        const total = (quota / 1024 / 1024).toFixed(1);
        setStorageUsage(`${used}MB / ${total}MB`);
      } else {
        setStorageUsage('Unavailable');
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <div className="p-2 bg-blue-950 rounded-lg mr-3">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
            <div className="ml-auto">
              <LanguageSwitcher/>
            </div>
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
                <Camera className="w-5 h-5 mr-2 text-neutral-400" />
                <CardTitle>{t('detection.title')}</CardTitle>
              </div>
              <CardDescription>
                {t('detection.description')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Hight Quality Mode */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">{t('detection.highAccuracy')}</Label>
                  <div className="text-sm text-gray-600">
                    {t('detection.highAccuracyHint')}
                  </div>
                </div>
                <Switch
                  checked={highQuality}
                  onCheckedChange={setHighQuality}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">{t('detection.threshold')}</Label>
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
                  {t('detection.thresholdHint')}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxDetections">{t('detection.maxDetections')}</Label>
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
                  {t('detection.maxDetectionsHint')}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Database className="w-5 h-5 mr-2 text-neutral-400" />
                <CardTitle>{t('data.title')}</CardTitle>
              </div>
              <CardDescription>
                {t('data.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">{t('data.autoSave')}</Label>
                  <div className="text-sm text-gray-600">
                    {t('data.autoSaveHint')}
                  </div>
                </div>
                <Switch
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* System Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Smartphone className="w-5 h-5 mr-2 text-neutral-400" />
                <CardTitle>{t('system.title')}</CardTitle>
              </div>
              <CardDescription>
                {t('system.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-sm">{t('system.connection')}: {connectionType}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Battery className="w-4 h-4 text-green-500" />
                  <span className="text-sm">
                    {t('system.battery')}: {batteryLevel !== null ? `${batteryLevel}%` : 'Loading...'}
                  </span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2 text-sm text-gray-600">
                <div>{t('system.version')}: 1.0.0</div>
                <div>{t('system.lastSync')}: 2 minutes ago</div>
                <div>{t('system.storage')}: {storageUsage}</div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-center">
            <Button onClick={handleSaveSettings} size="lg" className="w-full max-w-md">
              <Save className="w-4 h-4 mr-2" />
              {t('saveBtn')}
            </Button>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}