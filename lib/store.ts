'use client';
import { create } from 'zustand';
import { persist, createJSONStorage  } from 'zustand/middleware';

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
  _hydrated: boolean;

  setUser: (user: any) => void;
  setHydrated: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      _hydrated: false,

      setUser: (user) => set({ user }),
      setHydrated: (v) => set({ _hydrated: v }),
    }),
    {
      name: 'app-storage', // Unique name for the storage
      storage: createJSONStorage(()=>localStorage),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state, err) => {
        // 復元後フラグON
        state?.setHydrated(true);
      },
    }
  )
);