'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, TrendingUp, Package, Clock, DollarSign } from 'lucide-react';

const breadTypeData = [
  { name: 'クロワッサン', count: 45, percentage: 35 },
  { name: 'メロンパン', count: 32, percentage: 25 },
  { name: '食パン', count: 28, percentage: 22 },
  { name: 'あんぱん', count: 15, percentage: 12 },
  { name: 'カレーパン', count: 8, percentage: 6 },
];

const dailyTrendData = [
  { date: '1/1', detections: 23, sales: 18 },
  { date: '1/2', detections: 28, sales: 22 },
  { date: '1/3', detections: 35, sales: 30 },
  { date: '1/4', detections: 42, sales: 38 },
  { date: '1/5', detections: 38, sales: 35 },
  { date: '1/6', detections: 45, sales: 42 },
  { date: '1/7', detections: 52, sales: 48 },
];

const hourlyData = [
  { hour: '6:00', count: 5 },
  { hour: '7:00', count: 12 },
  { hour: '8:00', count: 18 },
  { hour: '9:00', count: 25 },
  { hour: '10:00', count: 22 },
  { hour: '11:00', count: 28 },
  { hour: '12:00', count: 35 },
  { hour: '13:00', count: 30 },
  { hour: '14:00', count: 20 },
  { hour: '15:00', count: 15 },
  { hour: '16:00', count: 8 },
  { hour: '17:00', count: 3 },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AnalyticsPage() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">分析・レポート</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総検出数</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,247</div>
              <p className="text-xs text-muted-foreground">
                今週 +12.5%
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均検出時間</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.3秒</div>
              <p className="text-xs text-muted-foreground">
                前週比 -0.2秒
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">売上効率</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94.2%</div>
              <p className="text-xs text-muted-foreground">
                目標値 90%
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">推定売上</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">¥89,500</div>
              <p className="text-xs text-muted-foreground">
                今週の推定値
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="trends">トレンド</TabsTrigger>
            <TabsTrigger value="types">パン種類</TabsTrigger>
            <TabsTrigger value="hourly">時間別</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>週間検出・売上トレンド</CardTitle>
                  <CardDescription>
                    検出数と実際の売上の比較
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="detections" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        name="検出数"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        name="売上数"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>パン種類別分布</CardTitle>
                  <CardDescription>
                    検出されたパンの種類別割合
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={breadTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name} ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {breadTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>詳細トレンド分析</CardTitle>
                <CardDescription>
                  時系列での検出パターンと売上相関
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={dailyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="detections" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      name="検出数"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#10B981" 
                      strokeWidth={3}
                      name="売上数"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="types" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>パン種類別詳細分析</CardTitle>
                <CardDescription>
                  各パン種類の検出数と売上実績
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={breadTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {breadTypeData.map((bread, index) => (
                <Card key={bread.name}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{bread.name}</p>
                        <p className="text-2xl font-bold text-blue-600">{bread.count}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">構成比</p>
                        <p className="text-lg font-semibold">{bread.percentage}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="hourly" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>時間別検出パターン</CardTitle>
                <CardDescription>
                  1日の時間帯別検出数の推移
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>ピーク時間</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">12:00</div>
                  <p className="text-sm text-gray-600">最も検出数が多い時間</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>オフピーク時間</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">17:00</div>
                  <p className="text-sm text-gray-600">最も検出数が少ない時間</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>平均検出数</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">18.3</div>
                  <p className="text-sm text-gray-600">時間あたりの平均</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />
    </div>
  );
}