import { create } from 'zustand';

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
}

interface AppState {
  user: User | null;
  detectionResults: DetectionResult[];
  currentImage: string | null;
  isDetecting: boolean;
  totalBreadCount: number;
  detectionMode: DetectionMode; // Current detection mode
  
  setUser: (user: any) => void;
  setDetectionResults: (results: DetectionResult[]) => void;
  setCurrentImage: (image: string | null) => void;
  setIsDetecting: (detecting: boolean) => void;
  setTotalItemCount: (count: number) => void;
  clearDetection: () => void;
  setDetectionMode: (mode: DetectionMode) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  detectionResults: [],
  currentImage: null,
  isDetecting: false,
  totalBreadCount: 0,  
  detectionMode: 'api', // Default detection mode

  setUser: (user) => set({ user }),
  setDetectionResults: (results) => set({ detectionResults: results }),
  setCurrentImage: (image) => set({ currentImage: image }),
  setIsDetecting: (detecting) => set({ isDetecting: detecting }),
  setTotalItemCount: (count) => set({ totalBreadCount: count }),
  clearDetection: () => set({ 
    detectionResults: [], 
    currentImage: null, 
    isDetecting: false, 
    totalBreadCount: 0 
  }),
  setDetectionMode: (mode: DetectionMode) => set({ detectionMode: mode})
}));