'use client';

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { toast } from 'sonner';
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import { Camera, BarChart as BarChartIcon , TrendingUp } from 'lucide-react';

type InventoryData = {
  date: string
  items: Record<string, number>
}

type ChartData = { hour?: string; day?: string; month?: string; total: number };


export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const router = useRouter();
  const { user, setUser } = useAppStore();
  const [range, setRange] = useState<'day' | 'week' | 'month' | 'year'>('day')
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10))
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10))
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // from と to を range + date から計算する関数（簡易版）
  const getFromTo = (): { from: string; to: string } => {
    const d = new Date(date)
    let from = ''
    let to = ''
    if (range === 'day') {
      from = date
  
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      to = next.toISOString().slice(0, 10);
    } else if (range === 'week') {
      // 例：その日を含む1週間前〜その日
      const prev = new Date(d)
      prev.setDate(d.getDate() - 6)
      from = prev.toISOString().slice(0, 10)
      to = date
    } else if (range === 'month') {
      const first = new Date(d.getFullYear(), d.getMonth(), 1)
      from = first.toISOString().slice(0, 10)
      to = date
    } else if (range === 'year') {
      const first = new Date(d.getFullYear(), 0, 1)
      from = first.toISOString().slice(0, 10)
      to = date
    }
    return { from, to }
  }

  const getLocalTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }

  const { from, to } = getFromTo()
  const tz = getLocalTimezone();

  const { data, error, isLoading } = useSWR<InventoryData[]>(
    user ? `/api/inventory-summary?from=${from}&to=${to}&tz=${tz}` : null,
    fetcher,
    {
      keepPreviousData: true
    }
  )
  if (error) {
    console.error('SWR error:', error)
    return <div>{t('error')}</div>
  }

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
    };
    getUser();
  }, [setUser]);

  useEffect(() => {
    if (!data) return;

    const newChartData: ChartData[] = [];
    const dailyTotals: Record<string, number> = {};
    
    if (range === 'day') {
      // "2025-11-01 08:00" 〜 "2025-11-01 22:00" などを2時間ごとに集計
      data.forEach(record => {
        const date = new Date(record.date);
        const hour = date.getHours();
        const slot = `${String(Math.floor(hour / 2) * 2).padStart(2, '0')}:00`;

        dailyTotals[slot] = (dailyTotals[slot] || 0) + Object.values(record.items).reduce((a, b) => a + b, 0);
      });

      for (let i = 0; i < 24; i += 2) {
        const label = `${String(i).padStart(2, '0')}:00`;
        newChartData.push({
          hour: label,
          total: dailyTotals[label] || 0,
        });
      }
    } else if (range === 'week') {
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      data.forEach(record => {
        const day = new Date(record.date).getDay(); // 0〜6
        const label = dayLabels[day];
        dailyTotals[label] = (dailyTotals[label] || 0) + Object.values(record.items).reduce((a, b) => a + b, 0);
      });

      dayLabels.forEach(label => {
        newChartData.push({
          day: label,
          total: dailyTotals[label] || 0,
        });
      });
    } else if (range === 'month') {
      data.forEach(record => {
        const day = new Date(record.date).getDate(); // 1〜31
        const label = String(day);
        dailyTotals[label] = (dailyTotals[label] || 0) + Object.values(record.items).reduce((a, b) => a + b, 0);
      });

      const daysInMonth = new Date(new Date(date).getFullYear(), new Date(date).getMonth() + 1, 0).getDate();

      for (let i = 1; i <= daysInMonth; i++) {
        const label = String(i);
        newChartData.push({
          day: label,
          total: dailyTotals[label] || 0,
        });
      }
    } else if (range === 'year') {
      const monthLabels  = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      data.forEach(record => {
        const month = new Date(record.date).getMonth(); // 0〜11
        const label = monthLabels[month];
        dailyTotals[label] = (dailyTotals[label] || 0) + Object.values(record.items).reduce((a, b) => a + b, 0);
      });

      monthLabels.forEach(label => {
        newChartData.push({
          month: label,
          total: dailyTotals[label] || 0,
        });
      });
    }

    setChartData(newChartData)
  }, [range, data, date])

  if (isLoading) return <div>{t('loading')}</div>

  // Quick Statsの情報、今日のサマリを取得
  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = data?.find(r => r.date === today)

  const detectedToday = todayRecord
    ? Object.values(todayRecord.items).reduce((a, b) => a + b, 0)
    : 0;

  const totalDetectedItems = data
    ? data.reduce((sum, record) => {
        return sum + Object.values(record.items).reduce((a, b) => a + b, 0);
      }, 0)
    : 0;

  const yesterday = (() => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const yesterdayRecord = data?.find(d => d.date === yesterday);
  const yesterdayCount = yesterdayRecord
    ? Object.values(yesterdayRecord.items).reduce((a, b) => a + b, 0)
    : 0;

  console.log('Yesterday Count:', yesterdayCount);
  console.log('Detected Today:', detectedToday);
  const deltaDayPercent = yesterdayCount > 0
    ? Math.round(((detectedToday) / yesterdayCount) * 100)
    : null; // or 0 or "--"

  console.log('📦 SWR data full:', JSON.stringify(data, null, 2))
  console.log('📅 selected date:', date)
  console.log('📌 todayRecord:', todayRecord)

  // CSVエクスポート処理
  const handleExportCSV = async () => {
    const { data, error } = await supabase
      .from('detections') // ←あなたのデータベース名に合わせてね
      .select('*');

    if (error || !data) {
      toast.error('CSV export failed');
      return;
    }

    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'detection_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const convertToCSV = (rows: any[]) => {
    if (rows.length === 0) return '';
    const header = Object.keys(rows[0]);
    const csvRows = rows.map(row =>
      header.map(field => JSON.stringify(row[field] ?? '')).join(',')
    );
    return [header.join(','), ...csvRows].join('\n');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="p-2 bg-blue-600 rounded-lg mr-3">
                <BarChartIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">{t('headerTitle')}</h1>
            </div>
            <LanguageSwitcher/>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {t('title')}
            </h2>
            <p className="text-gray-600">
              {t('description')}
            </p>
          </div>
            <Button
              className="bg-green-100 text-black border border-green-500 hover:bg-green-200 mt-2"
              onClick={handleExportCSV}
            >
              {t('export')}
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Inventory Summary */}
          <Card className="md:col-span-2 flexx flex-col">
            <CardHeader>
              <CardTitle>{t('inventorySummaryTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead className="text-gray-600 border-b">
                  <tr>
                    <th>{t('inventoryItem')}</th>
                    <th className="text-center">{t('inventoryCount')}</th>
                    <th className="text-center">{t('inventorySold')}</th>
                  </tr>
                </thead>
                <tbody>
                  {todayRecord ? (
                    Object.entries(todayRecord.items).map(([item, count]) => {
                      return (
                        <tr key={item} className="bg-gray-50 hover:bg-gray-100 rounded">
                          <td className="px-2 py-2 font-medium">{item}</td>
                          <td className="text-center">{count}</td>
                          <td className="text-center text-red-500 font-semibold">$---</td>
                        </tr>
                      )
                    })  
                  ) : (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-gray-500"> {t('noData')}</td>
                    </tr>
                  )}
                </tbody>  
              </table>
            </CardContent>
          </Card>

          {/* Sales Summary */}
          <div className="flex flex-col justify-between h-full space-y-4">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle> {t('salesTotal')} </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">$---</div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardHeader>
                <CardTitle> {t('salesMonth')} </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">$---</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 範囲選択 UI */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('rangeLabel')}</label>
            <select
              value={range}
              onChange={e => setRange(e.target.value as any)}
              className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm
             focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="day">{t('rangeDay')}</option>
              <option value="week">{t('rangeWeek')}</option>
              <option value="month">{t('rangeMonth')}</option>
              <option value="year">{t('rangeYear')}</option>
            </select>
          </div>

          {/* 日付入力 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('dateLabel')}</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="block w-44 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm
             focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* グラフ */}
        <div className="h-60 border p-4 rounded">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey={
                range === 'day' ? 'hour' :
                range === 'week' || range === 'month' ? 'day' :
                range === 'year' ? 'month' : ''
              } />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#200096ff" name="Total Count" />
              {/* 個別 object_type の Bar を追加したければこんな感じ：
              {keys.map(key => (
                <Bar key={key} dataKey={key} name={key} />
              ))} */}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('quickStats.detectedToday')}</CardTitle>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{detectedToday}</div>
              <p className="text-xs text-muted-foreground">
                {deltaDayPercent !== null
                  ? `${deltaDayPercent > 0 ? '+' : ''}${deltaDayPercent}% ${t('quickStats.vsYesterday')}`
                  : `-- ${t('quickStats.vsYesterday')}`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('quickStats.totalItems')}</CardTitle>
              <BarChartIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDetectedItems}</div>
              <p className="text-xs text-muted-foreground">
                {t('quickStats.vsLastMonth')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('quickStats.salesEfficiency')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-%</div>
              <p className="text-xs text-muted-foreground">
                {deltaDayPercent !== null
                  ? `${deltaDayPercent > 0 ? '+' : ''}${deltaDayPercent}% ${t('quickStats.vsYesterday')}`
                  : `-- ${t('quickStats.vsYesterday')}`}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}