'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { toast } from 'sonner';
import { Camera, RotateCcw, Save, Loader2, Eye, Clock } from 'lucide-react';


const SERVER_URL = "https://api.aicounter.net"; // local server api

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

interface DetectionHistory {
  id: string;
  timestamp: string;
  totalCount: number;
}

export default function CameraPage() {
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

  const loadHistory = () => {
    // Mock history data - in real app, load from database
    const mockHistory: DetectionHistory[] = [
      {
        id: '1',
        timestamp: '2024-01-15 14:30:25',
        totalCount: 12,
      }
    ];
    setDetectionHistory(mockHistory);
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

  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    const size = Math.max(videoWidth, videoHeight);
    const scale = Math.min(videoWidth, videoHeight) / size;
  
    const drawWidth = videoWidth * scale;
    const drawHeight = videoHeight * scale;
  
    canvas.width = drawWidth;
    canvas.height = drawHeight;
  
    // 描画開始（左上からでOK）
    context.drawImage(video, 0, 0, videoWidth, videoHeight, 0, 0, drawWidth, drawHeight);
  

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    setCurrentImage(imageData);

    // send to local
    const result = await sendToLocalServer(imageData);
    
    // Auto-detect after capture
    if (result) await detectItem(result, imageData);
  }, [setCurrentImage]);

  const detectItem = useCallback(async (result:any, imageData?: string) => {
    const targetImage = imageData || capturedImage;
    if (!targetImage || !result.items) return;

    setIsDetecting(true);
    
    try {
      const detectionBoxes: DetectionBox[] = result.items.map((item: any) => ({
        type: item.label || 'Unknown',
        confidence: 1.0, // 信頼度が無ければ仮で100%
        bbox: {
          x: item.box[0],
          y: item.box[1],
          width: item.box[2] - item.box[0],
          height: item.box[3] - item.box[1]
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
      // Create new history entry
      const newEntry: DetectionHistory = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('en-US'),
        totalCount,
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

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <h1 className="text-lg font-bold">Counting System</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Camera Section - Mobile Portrait Optimized */}
        <div className="relative bg-black mx-auto w-full max-w-[400px]" style={{ aspectRatio: '1/1'}}>
          <div className="absolute inset-0 flex items-center justify-center">
            {capturedImage ? (
              <div className="relative w-full h-full">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
                {/* Detection Boxes */}
                {detectionBoxes.map((box, index) => (
                  <div
                    key={index}
                    className="absolute border-2 border-red-500"
                    style={{
                      left: `${(box.bbox.x / 400) * 100}%`,
                      top: `${(box.bbox.y / 400) * 100}%`,
                      width: `${(box.bbox.width / 400) * 100}%`,
                      height: `${(box.bbox.height / 400) * 100}%`,
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
          <div className="p-3 bg-gray-800 border-t border-gray-700 flex-shrink-0">
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-400 mb-1">
                    Total: {totalCount} 
                  </div>
                  <div className="text-sm text-gray-300">
                    Type: Croissant  Qty: {totalCount}
                  </div>
                </div>
              </CardContent>
            </Card>
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
        <div className="flex-1 bg-gray-800 border-t border-gray-700 overflow-hidden flex flex-col min-h-0">
          <div className="p-3 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-gray-400" />
              <h3 className="text-base font-medium text-white"> Today's detection history </h3>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3">
            {detectionHistory.length === 0 ? (
              <p className="text-gray-400 text-center py-8 text-sm"> No detection history </p>
            ) : (
              <div className="space-y-2">
                {detectionHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                        <Camera className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <div className="font-medium text-white text-sm">Detected {entry.totalCount} pieces of item</div>
                        <div className="text-xs text-gray-400">{formatTime(entry.timestamp)}</div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300 hover:bg-gray-600 h-8 w-8 p-0"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
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