'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export function Providers({ children }: { children: React.ReactNode }) {
  const setUser = useAppStore((state) => state.setUser);
  const user = useAppStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, [setUser]);

  useEffect(() => {
    if (!user) return;

    let lastActivity = Date.now()

    const updateActivity = () => {
      lastActivity = Date.now()
    }

    window.addEventListener('mousemove', updateActivity)
    window.addEventListener('keydown', updateActivity)

    const interval = setInterval(() => {
      if (Date.now() - lastActivity > 5 * 60 * 1000) {
        console.log('⏰ xx分間操作なし → 自動ログアウト')
        setUser(null)
        localStorage.removeItem('user')
        router.push('/login')
      }
    }, 60 * 1000)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('mousemove', updateActivity)
      window.removeEventListener('keydown', updateActivity)
    }
  }, [user, setUser, router]);

  return <>{children}</>;
}