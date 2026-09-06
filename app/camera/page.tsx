'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { toast } from 'sonner';
import { Circle, Square, Loader2, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadScanVideo, createScanRecord, UploadHandle } from '@/lib/scan';

type RecordingState = 'idle' | 'recording' | 'preview' | 'uploading';

const RECORDING_MIME_CANDIDATES = [
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return undefined;
  }
  return RECORDING_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function CameraPage() {
  const t = useTranslations('camera')
  const router = useRouter();
  const { user, setUser } = useAppStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uploadHandleRef = useRef<UploadHandle | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
    };
    getUser();
  }, [setUser]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      toast.error(t('startCameraError'));
      console.error('Camera error:', error);
    }
  }, [t]);

  const stopCamera = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const startUpload = useCallback(async () => {
    if (!recordedBlob) return;
    if (!user) {
      toast.error(t('loginRequired'));
      return;
    }

    setRecordingState('uploading');
    setUploadProgress(0);

    const handle = uploadScanVideo(recordedBlob, user.id, user.company, setUploadProgress);
    uploadHandleRef.current = handle;

    try {
      const { jetsonScanId } = await handle.promise;
      const scan = await createScanRecord(user.id, user.company, jetsonScanId);
      toast.success(t('uploadSuccess'));
      router.push(`/space?scan=${scan.id}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast(t('uploadCancelled'));
      } else {
        console.error('Scan upload error:', error);
        toast.error(t('uploadFail'));
      }
      // 電波不良などで失敗しても撮影済みの動画は失わず、確認画面から再送信できるようにする
      setRecordingState('preview');
    } finally {
      uploadHandleRef.current = null;
    }
  }, [recordedBlob, user, t, router]);

  const cancelUpload = useCallback(() => {
    uploadHandleRef.current?.abort();
  }, []);

  const handleRetake = useCallback(() => {
    setRecordedBlob(null);
    setPreviewUrl(null);
    recordedChunksRef.current = [];
    setRecordingState('idle');
    startCamera();
  }, [startCamera]);

  const startRecording = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;

    const mimeType = pickSupportedMimeType();
    const mediaRecorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    recordedChunksRef.current = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunksRef.current.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: mimeType || 'video/webm',
      });
      setRecordedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setRecordingState('preview');
      stopCamera();
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setRecordingState('recording');
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, [stopCamera]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center h-14">
            <h1 className="text-lg font-bold text-white">{t('title')}</h1>
            <div className="ml-auto">
              <LanguageSwitcher textClassName="text-white"/>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Camera Section */}
        <div className="relative bg-black flex-1 w-full overflow-hidden">
          {recordingState === 'preview' || recordingState === 'uploading' ? (
            <video
              key="preview"
              src={previewUrl ?? undefined}
              controls={recordingState === 'preview'}
              playsInline
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <video
              key="live"
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-contain"
            />
          )}

          {recordingState === 'recording' && (
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1">
              <Circle className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" />
              <span className="text-sm font-mono">{formatElapsed(elapsedSeconds)}</span>
            </div>
          )}
        </div>

        <p className="text-center text-gray-400 text-xs py-2 px-4 flex-shrink-0">
          {recordingState === 'preview' || recordingState === 'uploading' ? t('previewHint') : t('recordHint')}
        </p>

        {/* Controls */}
        <div className="p-3 flex-shrink-0">
          {recordingState === 'preview' ? (
            <div className="flex justify-center space-x-3">
              <Button
                variant="outline"
                onClick={handleRetake}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 px-6"
              >
                {t('retake')}
              </Button>
              <Button
                onClick={startUpload}
                className="bg-blue-600 hover:bg-blue-700 px-6"
              >
                {t('send')}
              </Button>
            </div>
          ) : (
            <div className="flex justify-center space-x-3">
              {recordingState !== 'recording' ? (
                <Button
                  onClick={startRecording}
                  className="bg-red-600 hover:bg-red-700 px-6"
                  disabled={!isStreaming || recordingState === 'uploading' || !user}
                >
                  <Circle className="w-4 h-4 mr-2 fill-current" />
                  {t('startRecording')}
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  className="bg-gray-600 hover:bg-gray-700 px-6"
                >
                  <Square className="w-4 h-4 mr-2 fill-current" />
                  {t('stopRecording')}
                </Button>
              )}
            </div>
          )}

          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              onClick={() => router.push('/space')}
            >
              <History className="w-4 h-4 mr-2" />
              {t('viewHistory')}
            </Button>
          </div>
        </div>
      </main>

      <BottomNavigation />

      {recordingState === 'uploading' && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center gap-4 px-6">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          <span className="text-white font-medium text-sm">{t('uploading')}</span>
          <div className="w-full max-w-xs bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-150"
              style={{ width: `${Math.round(uploadProgress * 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-300">{Math.round(uploadProgress * 100)}%</span>
          <Button
            variant="outline"
            className="border-gray-500 text-gray-200 hover:bg-gray-800 mt-2"
            onClick={cancelUpload}
          >
            {t('cancelUpload')}
          </Button>
        </div>
      )}
    </div>
  );
}
