'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { buildAppUser } from '@/lib/auth';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { BarChart as BarChartIcon } from 'lucide-react';
import { getDashboardData } from '@/lib/dashboardData';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { SeasonTrendChart } from '@/components/dashboard/SeasonTrendChart';
import { NextActions } from '@/components/dashboard/NextActions';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { setUser } = useAppStore();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const appUser = await buildAppUser(session);
        if (appUser) setUser(appUser);
      }
    };
    getUser();
  }, [setUser]);

  // TODO: 実データ連携時にAPI経由の取得へ置き換える(lib/dashboardData.ts参照)
  const data = getDashboardData();

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="p-2 bg-blue-950 rounded-lg mr-3">
                <BarChartIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-neutral-900">{t('headerTitle')}</h1>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900 mb-2">{t('title')}</h2>
          <p className="text-neutral-500">{t('description')}</p>
        </div>

        <SummaryCards data={data} />

        <SeasonTrendChart data={data} />

        <NextActions data={data} />
      </main>

      <BottomNavigation />
    </div>
  );
}
