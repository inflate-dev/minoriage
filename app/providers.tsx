'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { IntlProvider } from 'next-intl'
import { messages as allMessages, Locale } from '../messages'

type Props = {
  children: React.ReactNode
}

export function Providers({ children }: Props) {
  const setUser = useAppStore((state) => state.setUser);
  const user = useAppStore((state) => state.user);
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('locale') as Locale) || 'en'
    }
    return 'en'}
  )

  useEffect(() => {
    const savedLocale = (localStorage.getItem('locale') as Locale) || 'en'
    setLocale(savedLocale)
  }, [])

  useEffect(() => {
    const onLocaleChange = (e: CustomEvent<Locale>) => {
      setLocale(e.detail)
    }

    window.addEventListener('locale-change', onLocaleChange as EventListener)

    return () => {
      window.removeEventListener('locale-change', onLocaleChange as EventListener)
    }
  }, [])

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

  if (!locale || !allMessages[locale]) return null

  return (
    <IntlProvider locale={locale} messages={allMessages[locale]}>
      {children}
    </IntlProvider>
  )
}