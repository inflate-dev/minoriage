'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function Providers({ children }: { children: React.ReactNode }) {
  const setUser = useAppStore((state) => state.setUser);
  const user = useAppStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    const checkLoginTimeout = async () => {
      const storedUser = localStorage.getItem('user')
      const loginTime = localStorage.getItem('loginTime')

      if (storedUser && loginTime) {
        const elapsed = Date.now() - parseInt(loginTime, 10)
        const limit = 90 * 60 * 1000

        if (elapsed > limit) {
          console.log('⏰ 1.5時間経過 → 強制ログアウト')
          await supabase.auth.signOut()
          localStorage.removeItem('user')
          localStorage.removeItem('loginTime')
          setUser(null)
          router.push('/login')
          return
        }

        setUser(JSON.parse(storedUser))
      }
    }

    checkLoginTimeout() // 初回表示時チェック！

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkLoginTimeout() // 復帰時にもチェック！
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [setUser, router])

  return <>{children}</>;
}