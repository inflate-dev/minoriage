'use client';
import { create } from 'zustand';
import { persist, createJSONStorage  } from 'zustand/middleware';

type DetectionMode = 'api' | 'ref' | 'ai';

interface DetectionResult {
  id: string;
  type: string;
  quantity: number;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface User {
  id: string;
  email: string;
  role: string;
  token: string;
  company: string;
  name?: string; // Optional field for user's name
  created_at?: string; // Optional field for account creation date
  plan?: string; // Optional field for user's plan
  price?: string; // Optional field for user's plan price
}

interface AppState {
  user: User | null;
  detectionResults: DetectionResult[];
  currentImage: string | null;
  isDetecting: boolean;
  totalBreadCount: number;
  detectionMode: DetectionMode; // Current detection mode
  _hydrated: boolean;
  
  setUser: (user: any) => void;
  setDetectionResults: (results: DetectionResult[]) => void;
  setCurrentImage: (image: string | null) => void;
  setIsDetecting: (detecting: boolean) => void;
  setTotalItemCount: (count: number) => void;
  clearDetection: () => void;
  setDetectionMode: (mode: DetectionMode) => void;
  setHydrated: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      detectionResults: [],
      currentImage: null,
      isDetecting: false,
      totalBreadCount: 0,  
      detectionMode: 'ai', // Default detection mode
      _hydrated: false,

      setUser: (user) => set({ user }),
      setDetectionResults: (results) => set({ detectionResults: results }),
      setCurrentImage: (image) => set({ currentImage: image }),
      setIsDetecting: (detecting) => set({ isDetecting: detecting }),
      setTotalItemCount: (count) => set({ totalBreadCount: count }),
      clearDetection: () => set({ 
        detectionResults: [], 
        currentImage: null, 
        isDetecting: false, 
        totalBreadCount: 0, 
      }),
      setDetectionMode: (mode: DetectionMode) => set({ detectionMode: mode}),
      setHydrated: (v) => set({ _hydrated: v }),
    }),
    { 
      name: 'app-storage', // Unique name for the storage
      storage: createJSONStorage(()=>localStorage),
      partialize: (state) => ({ detectionMode: state.detectionMode, user: state.user }),
      onRehydrateStorage: () => (state, err) => {
        // 復元後フラグON
        state?.setHydrated(true);
      },
    }
  )
);