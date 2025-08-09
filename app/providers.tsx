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
  }, []);

  useEffect(() => {
    if (!user) return;

    const timeout = setTimeout(() => {
      console.log('⏰ セッション切れ：自動ログアウト');

      setUser(null);
      localStorage.removeItem('user');
      router.push('/login'); // ログイン画面へリダイレクト
    }, 120 * 60 * 1000); // 30分

    return () => clearTimeout(timeout); // クリーンアップ
  }, [user, setUser, router]);

  return <>{children}</>;
}