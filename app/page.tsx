'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { buildAppUser } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  const setUser = useAppStore((state) => state.setUser);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const appUser = await buildAppUser(session);
        if (appUser) setUser(appUser);
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    };

    checkUser();
  }, [router, setUser]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-950"></div>
    </div>
  );
}