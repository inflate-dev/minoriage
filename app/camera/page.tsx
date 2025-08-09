'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { toast } from 'sonner';
import { Camera, RotateCcw, Save, Loader2, Eye, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';


const SERVER_URL = process.env.NEXT_PUBLIC_LOCAL_SERVER_URL; // local server api
const DEBUG_MODE = false;

interface DetectionBox {
  type: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface TotalDetction {
  type: string;
  count: number;
}

interface DetectionHistory {
  id: string;
  timestamp: string;
  totalCount: number;
  typeCounts: { [type: string]: number }; 
}

export default function CameraPage() {
  const user = useAppStore(state => state.user);
  const { detectionMode } = useAppStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectionBoxes, setDetectionBoxes] = useState<DetectionBox[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [detectionHistory, setDetectionHistory] = useState<DetectionHistory[]>([]);
  
  const { 
    isDetecting, 
    setIsDetecting, 
    setDetectionResults, 
    setCurrentImage 
  } = useAppStore();

  // Auto-start camera when component mounts
  useEffect(() => {
    startCamera();
    loadHistory();
    
    // Cleanup camera on unmount
    return () => {
      stopCamera();
    };
  }, []);

  // Load today's detection history from Supabase
  const loadHistory = async  () => {
    // 今日の00:00:00をISO文字列で作成（UTC対応）
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartISO = todayStart.toISOString();

    const { data, error } = await supabase
    .from('detections')
    .select(`
      upload_id,
      object_type,
      bbox,
      created_at
    `)
    .gte('created_at', todayStartISO) 
    .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Failed to load detection history:', error.message);
      return;
    }

    if (!data) return;

    // upload_id ごとにまとめて、bboxの合計数をカウント
    const grouped = data.reduce((acc, row) => {
      const id = row.upload_id;
  
      if (!acc[id]) {
        acc[id] = {
          id,
          timestamp: row.created_at,
          totalCount: 0,
          typeCounts: {} as Record<string, number>
        };
      }
  
      const count = Array.isArray(row.bbox) ? row.bbox.length : 0;
      acc[id].totalCount += count;
  
      const label = row.object_type || 'unknown';
      acc[id].typeCounts[label] = (acc[id].typeCounts[label] || 0) + count;
  
      return acc;
    }, {} as Record<string, DetectionHistory>);

    const history = Object.values(grouped);
    setDetectionHistory(history);
  };

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      toast.error('Failed to start camera');
      console.error('Camera error:', error);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsStreaming(false);
    }
  }, []);

  const sendToLocalServer = async (imageDataUrl: string) => {
    const blob = await (await fetch(imageDataUrl)).blob();
    const formData = new FormData();
    formData.append('image', blob, 'captured.jpg');
    formData.append('company', user?.company || 'e407c2d2-19e1-4e4e-b973-f349772edf0a');
    formData.append('user', user?.id || '279af390-d2b0-4222-bb78-cc680ac5a9a8');
    formData.append('mode', detectionMode || 'api');
  
    try {
      const res = await fetch(`${SERVER_URL}/upload`, {
        method: 'POST',
        body: formData
      });
  
      const result = await res.json();
      console.log('📬 Response from local server:', result);
      return result;
    } catch (err) {
      console.error('❌ Failed to send image to local server:', err);
      return null;
    }
  };

  const captureImageNormal = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    // 正方形クロップサイズと開始位置を計算（中心から）
    const squareSize = Math.min(videoWidth, videoHeight);
    const startX = (videoWidth - squareSize) / 2;
    const startY = (videoHeight - squareSize) / 2;

    const exportSize = 600; // ← 送る画像のサイズ

    // canvasサイズは送信用に600x600に！
    canvas.width = exportSize;
    canvas.height = exportSize;

    // クロップした範囲をcanvasに描画
    context.drawImage(
      video,
      startX, startY, squareSize, squareSize, // クロップ元
      0, 0, exportSize, exportSize            // 描画先
    );
  
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    setCurrentImage(imageData);

    // send to local
    const result = await sendToLocalServer(imageData);
    
    // Auto-detect after capture
    if (result) await detectItem(result, imageData);
  }, [setCurrentImage]);

  const captureImageDebug = useCallback(async () => {
    // ★ ローカルファイルを直接fetch！
    const testImageUrl = '/ref_sample2.jpg';
  
    const response = await fetch(testImageUrl);
    const blob = await response.blob();
  
    // blobからdataURLに変換（UIにも表示するなら）
    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageData = reader.result as string;
  
      setCapturedImage(imageData);
      setCurrentImage(imageData);
  
      // send to local
      const result = await sendToLocalServer(imageData);
      if (result) await detectItem(result, imageData);
    };
    reader.readAsDataURL(blob);
  }, [setCurrentImage]);

  const captureImage = useCallback(() => {
    setIsDetecting(true);
    if (DEBUG_MODE) {
      captureImageDebug();
    } else {
      captureImageNormal();
    }
  }, [DEBUG_MODE, captureImageDebug, captureImageNormal]);

  const detectItem = useCallback(async (result:any, imageData?: string) => {
    const targetImage = imageData || capturedImage;
    if (!targetImage || !result.items) return;

    
    try {
      const detectionBoxes: DetectionBox[] = result.items.map((item: any) => ({
        type: item.label || 'Unknown',
        confidence: 1.0, // 信頼度が無ければ仮で100%
        bbox: {
          x: (item.box[0] + item.box[2]) / 2 * (2 / 3), // 600x600から400x400に変換
          y: (item.box[1] + item.box[3]) / 2 * (2 / 3),
          width: (item.box[2] - item.box[0]) * (2 / 3),
          height: (item.box[3] - item.box[1]) * (2 / 3)
        }
      }));
      // Simulate API call to object detection service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock detection results based on the reference image
      setDetectionBoxes(detectionBoxes);
      setTotalCount(detectionBoxes.length);
      setDetectionResults(detectionBoxes.map((det, idx) => ({
        id: `det-${idx}`,
        type: det.type,
        quantity: 1,
        confidence: det.confidence,
        bbox: det.bbox
      })));
      
      toast.success(`${detectionBoxes.length} item(s) detected`);
    } catch (error) {
      toast.error('Detection failed');
      console.error('Detection error:', error);
    } finally {
      setIsDetecting(false);
    }
  }, [capturedImage, setIsDetecting, setDetectionResults]);

  const retryCapture = useCallback(() => {
    setCapturedImage(null);
    setDetectionBoxes([]);
    setTotalCount(0);
    startCamera();
  }, [startCamera]);

  const saveResults = useCallback(async () => {
    if (detectionBoxes.length === 0) {
      toast.error('No detection results to sav');
      return;
    }

    try {
      const typeCounts = detectionBoxes.reduce((acc, box) => {
        acc[box.type] = (acc[box.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Create new history entry
      const newEntry: DetectionHistory = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('en-US'),
        totalCount,
        typeCounts,
      };
      
      setDetectionHistory(prev => [newEntry, ...prev]);
      toast.success('Detection results saved');
      
      // Reset for next detection
      setCapturedImage(null);
      setDetectionBoxes([]);
      setTotalCount(0);
      startCamera();
    } catch (error) {
      toast.error('Failed to save detection results');
      console.error('Save error:', error);
    }
  }, [detectionBoxes, totalCount, capturedImage, startCamera]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const countsByType = detectionBoxes.reduce((acc, box) => {
    const type = box.type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center h-14">
            <h1 className="text-lg font-bold text-white">Counting System</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Camera Section - Mobile Portrait Optimized */}
        <div className="relative bg-black mx-auto w-full max-w-[400px] p-2 rounded-md" style={{ aspectRatio: '1/1'}}>
          <div className="absolute inset-0 flex items-center justify-center">
            {capturedImage ? (
              <div className="relative w-full h-full">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
                {/* Detection Boxes */}
                {detectionMode === 'ai' && detectionBoxes.map((box, index) => (
                  <div
                    key={index}
                    className="absolute w-3 h-3 rounded-full bg-red-500"
                    style={{
                      left: `${(box.bbox.x / 400 ) * 100}%`,
                      top: `${(box.bbox.y /400 ) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div className="bg-red-500 text-white text-xs px-1 py-0.5 absolute -top-5 left-0 whitespace-nowrap text-[10px]">
                      {box.type}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Detection Status Overlay */}
            {isDetecting && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-gray-800 p-4 rounded-lg flex items-center space-x-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                  <span className="text-white font-medium text-sm">detecting...</span>
                </div>
              </div>
            )}
          </div>
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Results Display */}
        {totalCount > 0 && (
          <div className="w-full flex justify-center mt-4">
            <div className="bg-gray-700 text-white rounded-lg shadow-md p-4 w-full max-w-sm">
              <div className="text-xl font-bold text-blue-400 mb-2 text-center">
                Total: {totalCount}
              </div>
              <div className="text-sm text-gray-300 text-center">
                {Object.entries(countsByType).map(([type, count]) => (
                  <div key={type} className="flex justify-center gap-6 px-2 text-base">
                    <span>Type: {type}</span>
                    <span>Qty: {count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {totalCount == 0 && (
          <div className="p-3 text-center text-gray-400 text-sm">
            No detections
          </div>
        )}

        {/* Controls - Always at Bottom */}
        <div className="p-3  flex-shrink-0">
          <div className="flex justify-center space-x-3">
            <Button
              onClick={captureImage}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 px-4"
              disabled={!isStreaming || isDetecting}
            >
              <Camera className="w-4 h-4 mr-1" />
              Capture
            </Button>
            
            <Button
              onClick={retryCapture}
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 px-4"
              disabled={isDetecting}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Retry
            </Button>
            
            <Button
              onClick={saveResults}
              size="sm"
              className="bg-green-600 hover:bg-green-700 px-4"
              disabled={detectionBoxes.length === 0 || isDetecting}
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>

        {/* History Section - Scrollable */}
        <div className="w-full flex justify-center mt-6">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="flex items-center text-gray-400 text-sm border-b border-gray-700 pb-2 mb-2">
              <Clock className="w-4 h-4 mr-2 text-gray-400" />
              <h3 className="text-base font-medium text-white"> Today's detection history </h3>
            </div>
          
            {/* Empty state */}
            {detectionHistory.length === 0 ? (
              <p className="text-gray-500 text-sm text-center">No detection history</p>
            ) : (
              <div className="space-y-3">
                {detectionHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-gray-700 rounded-md p-3 text-sm text-gray-200 shadow-sm"
                  >
                    <div className="font-semibold text-blue-400">
                      {formatTime(entry.timestamp)}
                    </div>
                    <div>Total: {entry.totalCount}</div>
                    {Object.entries(entry.typeCounts).map(([type, count]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span>Type: {type}</span>
                        <span>Qty: {count}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>

      </main>

      <BottomNavigation />
    </div>
  );
}