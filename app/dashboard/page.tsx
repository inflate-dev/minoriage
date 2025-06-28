'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { toast } from 'sonner';
import { Camera, BarChart3, LogOut, Wheat, Smartphone, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, setUser } = useAppStore();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
    };
    getUser();
  }, [setUser]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      toast.success('ログアウトしました');
      router.push('/login');
    } catch (error: any) {
      toast.error('ログアウトに失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="p-2 bg-blue-600 rounded-lg mr-3">
                <Wheat className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Bread Factory</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            ダッシュボード
          </h2>
          <p className="text-gray-600">
            パンの検出と在庫管理システムへようこそ
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日の検出数</CardTitle>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">
                前日比 +12%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総パン数</CardTitle>
              <Wheat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">347</div>
              <p className="text-xs text-muted-foreground">
                現在の在庫
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">売上効率</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">92%</div>
              <p className="text-xs text-muted-foreground">
                前週比 +5%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center">
                <div className="p-3 bg-blue-600 rounded-full mr-4">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">パン検出</CardTitle>
                  <CardDescription>
                    カメラでパンを撮影して自動検出
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                スマートフォンのカメラを使用してテーブル上のパンを撮影し、AIが自動的にパンの種類と数量を検出します。
              </p>
              <Button 
                onClick={() => router.push('/camera')} 
                className="w-full"
              >
                <Camera className="w-4 h-4 mr-2" />
                検出開始
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center">
                <div className="p-3 bg-green-600 rounded-full mr-4">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">分析・レポート</CardTitle>
                  <CardDescription>
                    在庫状況と売上分析
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                検出されたデータを基に在庫状況、売上トレンド、効率分析などの詳細なレポートを確認できます。
              </p>
              <Button 
                onClick={() => router.push('/analytics')} 
                className="w-full"
                variant="outline"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                分析画面へ
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>最近の活動</CardTitle>
            <CardDescription>
              最新の検出結果と活動履歴
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Camera className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">クロワッサン検出完了</p>
                  <p className="text-sm text-gray-600">12個のクロワッサンを検出 - 2分前</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-green-100 rounded-full">
                  <Wheat className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">食パン在庫更新</p>
                  <p className="text-sm text-gray-600">24個の食パンを検出 - 15分前</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation />
    </div>
  );
}