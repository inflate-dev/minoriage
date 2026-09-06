'use client';
import { create } from 'zustand';
import { persist, createJSONStorage  } from 'zustand/middleware';

type DetectionMode = 'api' | 'ref' | 'ai';

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
  detectionMode: DetectionMode; // Current detection mode
  _hydrated: boolean;

  setUser: (user: any) => void;
  setDetectionMode: (mode: DetectionMode) => void;
  setHydrated: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      detectionMode: 'ai', // Default detection mode
      _hydrated: false,

      setUser: (user) => set({ user }),
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