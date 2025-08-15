'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { Plus } from 'lucide-react';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
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

const SERVER_URL = process.env.NEXT_PUBLIC_LOCAL_SERVER_URL;

export default function SettingsPage() {
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
    toast.success('Settings saved successfully');
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
      toast.error('Image size exceeds 5MB limit');
      return;
    }

    const isJPG = /\.(jpe?g)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') && file.type === 'image/jpeg';

    if (!isImage || !isJPG) {
      toast.error('Only JPG image files are allowed');
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
        toast.success('Sample image uploaded!');
      } else {
        toast.warning('No image URL returned');
      }

    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload image');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
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
                <CardTitle>Detection Settings</CardTitle>
              </div>
              <CardDescription>
                Configure item detection functionality
              </CardDescription>
            </CardHeader>

            {/* Mode Select */}
            <CardContent className="space-y-6">
              <div className="flex flex-col space-y-6">
                <div className="space-y-0.5">
                  <Label className="text-base">Item Detection Mode</Label>
                  <div className="text-sm text-gray-600">
                    Select a method for detecting and counting items from the captured image.
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
                    className="mt-1 form-radio text-blue-700"
                  />
                  <label htmlFor="ai" className="text-lg font-medium">AI Mode</label>
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
                    className="mt-1 form-radio text-blue-700"
                  />
                  <label htmlFor="api" className="text-lg font-medium">chatGPT Mode</label>
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
                    className="mt-1 form-radio text-blue-700"
                  />
                  <label htmlFor="sample" className="text-lg font-medium">Reference Mode</label>
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
                  <Label className="text-base">High Accuracy Mode</Label>
                  <div className="text-sm text-gray-600">
                    Capture in high resolution for more accurate results
                  </div>
                </div>
                <Switch
                  checked={highQuality}
                  onCheckedChange={setHighQuality}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">Threshold</Label>
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
                  Confidence threshold for detections.1-1.0）
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxDetections">Max Detections</Label>
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
                  Maximum number of item types to process per detection
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Database className="w-5 h-5 mr-2 text-green-600" />
                <CardTitle>Data Settings</CardTitle>
              </div>
              <CardDescription>
                Manage data saving and sync options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto Save</Label>
                  <div className="text-sm text-gray-600">
                    Automatically save detection results to database
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
                <Smartphone className="w-5 h-5 mr-2 text-purple-600" />
                <CardTitle>System Info</CardTitle>
              </div>
              <CardDescription>
                App and device status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Connection: {connectionType}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Battery className="w-4 h-4 text-green-500" />
                  <span className="text-sm">
                    Battery: {batteryLevel !== null ? `${batteryLevel}%` : 'Loading...'}
                  </span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2 text-sm text-gray-600">
                <div>App Version: 1.0.0</div>
                <div>Last Sync: 2 minutes ago</div>
                <div>Storage Usage: {storageUsage}</div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-center">
            <Button onClick={handleSaveSettings} size="lg" className="w-full max-w-md">
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}