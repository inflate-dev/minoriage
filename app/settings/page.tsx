'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { Plus, Settings } from 'lucide-react';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { 
  Camera, 
  Smartphone, 
  Database, 
  Wifi,
  Battery,
  Save
} from 'lucide-react';

const SERVER_URL = process.env.NEXT_PUBLIC_LOCAL_SERVER_URL;

export default function SettingsPage() {
  const t = useTranslations('settings')
  const user = useAppStore((state) => state.user);
  const { detectionMode, setDetectionMode } = useAppStore();
  const [highQuality, setHighQuality] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [detectionThreshold, setDetectionThreshold] = useState('0.8');
  const [maxDetections, setMaxDetections] = useState('50');
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [connectionType, setConnectionType] = useState('wifi');
  const [storageUsage, setStorageUsage] = useState('0MB / 0MB');
  const [sampleImages, setSampleImages] = useState<string[]>([]);

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

    // Fetch user's profile image from Supabase
    if (!user) return;
    const fetchProfileImage = async () => {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('ref_url')
        .eq('user_id', user.id)
        .single()
      
      console.log('Profile Data:', profileData?.ref_url);
      if (profileData?.ref_url) {
        setSampleImages([...sampleImages, profileData.ref_url]);
      }
      if (error) {
        console.error('Error fetching profile:', error.message);
        return;
      }
    };
    
    fetchProfileImage();    

  }, []);

  // Handle image upload for sample images
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file); // 'image' はAPIが期待する名前に合わせてね！
    formData.append('user_id', user?.id || ''); // ユーザーIDを追加
    formData.append('company', user?.company || ''); // 会社名を追加

    // ここでAPIに送信する処理を追加することもできます
    // 例えば、fetchを使って送信することができます
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('detection.uploadLimit'));
      return;
    }

    const isJPG = /\.(jpe?g)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') && file.type === 'image/jpeg';

    if (!isImage || !isJPG) {
      toast.error(t('detection.uploadType'));
      return;
    }

    try {
      const response = await fetch(`${SERVER_URL}/upload_ref`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // 例: アップロード後に画像のURLが返ってくると仮定
      if (data?.url) {
        setSampleImages([...sampleImages, data.url]);
        toast.success(t('detection.uploadSuccess'));
      } else {
        toast.warning(t('detection.uploadWarning'));
      }

    } catch (err) {
      console.error('Upload error:', err);
      toast.error(t('detection.uploadFail'));
    }


    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setSampleImages([...sampleImages, reader.result.toString()]);
      }
    };
    reader.readAsDataURL(file);
  };

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

            {/* Mode Select */}
            <CardContent className="space-y-6">
              <div className="flex flex-col space-y-6">
                <div className="space-y-0.5">
                  <Label className="text-base">{t('detection.modeLabel')}</Label>
                  <div className="text-sm text-gray-600">
                    {t('detection.modeHint')}
                  </div>
                </div>
                                
                {/* AI Mode */}
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    id="ai"
                    name="detectionMode"
                    value="ai"
                    checked={detectionMode === 'ai'}
                    onChange={() => setDetectionMode('ai')}
                    className="mt-1 form-radio text-blue-950"
                  />
                  <label htmlFor="ai" className="text-lg font-medium">{t('detection.aiMode')}</label>
                </div>
                {/* API Mode */}
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    id="api"
                    name="detectionMode"
                    value="api"
                    checked={detectionMode === 'api'}
                    onChange={() => setDetectionMode('api')}
                    className="mt-1 form-radio text-blue-950"
                  />
                  <label htmlFor="api" className="text-lg font-medium">{t('detection.apiMode')}</label>
                </div>
               
                {/* ref Mode */}
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    id="ref"
                    name="detectionMode"
                    value="ref"
                    checked={detectionMode === 'ref'}
                    onChange={() => setDetectionMode('ref')}
                    className="mt-1 form-radio text-blue-950"
                  />
                  <label htmlFor="sample" className="text-lg font-medium">{t('detection.refMode')}</label>
                </div>
                {/* Sample Images (only visible when sample mode is selected) */}
                {detectionMode === 'ref' && (
                  <div className="ml-6 mt-2 flex flex-wrap gap-4">
                    {sampleImages.map((src, index) => (
                      <img
                        key={index}
                        src={src}
                        alt={`sample-${index}`}
                        className="w-24 h-24 object-cover rounded border"
                      />
                    ))}
                    <div className="w-24 h-24 relative border border-gray-400 rounded overflow-hidden cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 z-10 cursor-pointer"
                        onChange={handleImageUpload}
                      />
                      <div className="absolute inset-0 flex items-center justify-center z-0">
                        <Plus className="w-6 h-6 text-gray-700" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
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