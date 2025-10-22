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
    let newChartData: ChartData[] = [];

    if (range === 'day') {
      newChartData = Array.from({ length: 12 }, (_, i) => {
        const hour = i * 2
        return {
          hour: `${String(hour).padStart(2, '0')}:00`,
          total: Math.floor(Math.random() * 10), // 仮データ
        }
      })
    } else if (range === 'week') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      newChartData = days.map(day => ({
        day,
        total: Math.floor(Math.random() * 50),
      }))
    } else if (range === 'month') {
      newChartData = Array.from({ length: 30 }, (_, i) => ({
        day: `${i + 1}`,
        total: Math.floor(Math.random() * 50),
      }))
    } else if (range === 'year') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      newChartData = months.map(month => ({
        month,
        total: Math.floor(Math.random() * 300),
      }))
    }

    setChartData(newChartData)
  }, [range])

  // from と to を range + date から計算する関数（簡易版）
  const getFromTo = (): { from: string; to: string } => {
    const d = new Date(date)
    let from = ''
    let to = ''
    if (range === 'day') {
      from = '2025-10-01'
      //from = date
      to = date
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

  const { from, to } = getFromTo()

  const { data, error, isLoading } = useSWR<InventoryData[]>(
    user ? `/api/inventory-summary?from=${from}&to=${to}` : null,
    fetcher,
    {
      keepPreviousData: true
    }
  )
  if (error) {
    console.error('SWR error:', error)
    return <div>{t('error')}</div>
  }

  if (isLoading) return <div>{t('loading')}</div>

  // 今日のサマリ（range=day のときだけ表示したいかも）
  const todayRecord = data?.find(r => r.date === date)

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
                      const sold = Math.floor(Math.random() * 40) // 仮の売上数
                      return (
                        <tr key={item} className="bg-gray-50 hover:bg-gray-100 rounded">
                          <td className="px-2 py-2 font-medium">{item}</td>
                          <td className="text-center">{count}</td>
                          <td className="text-center text-red-500 font-semibold">{sold}</td>
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
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">
                {t('quickStats.vsYesterday')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('quickStats.totalItems')}</CardTitle>
              <BarChartIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">347</div>
              <p className="text-xs text-muted-foreground">
                {t('quickStats.vsYesterday')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('quickStats.salesEfficiency')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">92%</div>
              <p className="text-xs text-muted-foreground">
                {t('quickStats.vsLastWeek')}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}