'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Loader2, Wheat } from 'lucide-react';

export default function LoginPage() {
  const t = useTranslations('login')
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const setUser = useAppStore((state) => state.setUser);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // ✅ ログイン処理
      const login = async () => {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        })
        const result = await res.json();
        const { session } = result;
      
        if (session) {
          const { access_token, user } = session;
          if (user) {
            
            setUser({id: user.id, email: user.email, role: user.role , token: access_token, 
              company: user.company, name: user.name, created_at: user.created_at, plan: user.plan, price: user.price});
            localStorage.setItem('loginTime', Date.now().toString()) 
          }
          localStorage.setItem('user', JSON.stringify(user));
          router.replace('/camera'); // ←ここでリダイレクト
        } else {
          console.error('Login failed', result)
          setError(t('toastLoginFail'));
        }
      }
      login();
    } catch (error: any) {
      toast.error(error.message || t('taostLoginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
    <header className="bg-white shadow-sm border-b px-4 py-2 flex justify-end">
      <LanguageSwitcher />
    </header>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <Wheat className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('enterEmail')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('enterPassword')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('loginLoading')}
                    </>
                  ) : (
                    t('loginBtn')
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => router.push('/signup')}
                >
                  {t('registerUser')}
                </Button>
              </form>
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  </div>
  );
}