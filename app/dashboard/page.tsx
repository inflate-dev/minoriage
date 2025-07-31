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
                <Wheat className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">AI Item Counter</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Dashboard
            </h2>
            <p className="text-gray-600">
              Welcome to the AI Item counter and inventory management system.
            </p>
          </div>
            <Button
              className="bg-green-100 text-black border border-green-500 hover:bg-green-200 mt-2"
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Detected Today</CardTitle>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">
                +12% vs yesterday
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Detected Items</CardTitle>
              <Wheat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">347</div>
              <p className="text-xs text-muted-foreground">
                Current Stock
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales Efficiency</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">92%</div>
              <p className="text-xs text-muted-foreground">
                +5% vs last week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center">
                <div className="p-3 bg-green-600 rounded-full mr-4">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Analytics & Reports</CardTitle>
                  <CardDescription>
                    Inventory & sales insights
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                View detailed reports including inventory status, sales trends, and efficiency based on the detection data.
              </p>
              <Button 
                onClick={() => router.push('/analytics')} 
                className="w-full"
                variant="outline"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Reports
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center">
                <div className="p-3 bg-blue-600 rounded-full mr-4">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Item Detection</CardTitle>
                  <CardDescription>
                    Use camera to detect Item automatically
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Use your phone’s camera to take a photo of breads on a table. The AI will automatically detect types and counts.
              </p>
              <Button 
                onClick={() => router.push('/camera')} 
                className="w-full"
              >
                <Camera className="w-4 h-4 mr-2" />
                Start Detection
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest detections and activity history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Camera className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Croissant Detection Completed</p>
                  <p className="text-sm text-gray-600">12 items detected - 2 min ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-green-100 rounded-full">
                  <Wheat className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Inventory Updated</p>
                  <p className="text-sm text-gray-600">24 loaves detected - 15 min ago</p>
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