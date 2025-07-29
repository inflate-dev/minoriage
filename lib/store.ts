import { create } from 'zustand';

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
}

interface AppState {
  user: User | null;
  detectionResults: DetectionResult[];
  currentImage: string | null;
  isDetecting: boolean;
  totalBreadCount: number;
  
  setUser: (user: any) => void;
  setDetectionResults: (results: DetectionResult[]) => void;
  setCurrentImage: (image: string | null) => void;
  setIsDetecting: (detecting: boolean) => void;
  setTotalItemCount: (count: number) => void;
  clearDetection: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  detectionResults: [],
  currentImage: null,
  isDetecting: false,
  totalBreadCount: 0,
  
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
}));