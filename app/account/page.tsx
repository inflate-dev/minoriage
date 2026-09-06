'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl'
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  LogOut, 
  Edit3, 
  Save,
  Camera,
  Trash2
} from 'lucide-react';
import { ManagePlanModal } from '@/components/subscription/ManagePlanModal';

export default function AccountPage() {
  const t = useTranslations('account')
  const router = useRouter();
  const { user, setUser } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || 'User');
  const [email, setEmail] = useState(user?.email || 'demo@breadfactory.com');
  const [company, setCompany] = useState(user?.company || 'Demo Company');
  const searchParams = useSearchParams();

  useEffect(() => {
    setName(user?.name || 'User');
    setEmail(user?.email || 'sample@email.com');
    setCompany(user?.company || 'Demo Company');
  }, [user, router]);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success(t('toast.upgraded'));

      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete("success");
        window.history.replaceState({}, "", url.toString());
      }, 3000);
    }
  }, [searchParams]);

  const handleSaveProfile = () => {
    // Here you would update the user profile in Supabase
    toast.success(t('toast.profileUpdated'));
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('user');
      toast.success(t('logout.success'));
      router.push('/login');
    } catch (error: any) {
      toast.error(t('logout.fail') + error.message);
    }
  };

  const handleDeleteAccount = () => {
    // Here you would show a confirmation dialog and delete account
    toast.error(t('data.deleteWarning'));
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <div className="p-2 bg-blue-950 rounded-lg mr-3">
              <User className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
            <div className="ml-auto">
              <LanguageSwitcher/>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <User className="w-5 h-5 mr-2 text-neutral-400" />
                  <CardTitle>{t('profile.title')}</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {t('profile.save')}
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4 mr-2" />
                      {t('profile.edit')}
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src="/placeholder-avatar.png" />
                  <AvatarFallback className="text-lg">
                    {name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">{t('profile.name')}</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">{t('profile.email')}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{name}</h3>
                      <div className="flex items-center text-gray-600">
                        <Mail className="w-4 h-4 mr-2" />
                        {email}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {t('profile.joined')}: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex space-x-2">
                  <Button onClick={handleSaveProfile} size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    {t('profile.save')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    {t('profile.cancel')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-neutral-400" />
                <CardTitle>{t('security.title')}</CardTitle>
              </div>
              <CardDescription>
                {t('security.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                <Shield className="w-4 h-4 mr-2" />
                {t('security.changePassword')}
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Camera className="w-4 h-4 mr-2" />
                {t('security.setup2fa')}
              </Button>
            </CardContent>
          </Card>

          {/* Subscription Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Mail className="w-5 h-5 mr-2 text-neutral-400" />
                <div>
                  <CardTitle>{t('subscription.title')}</CardTitle>
                  <CardDescription>{t('subscription.description')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-700">
                <p>
                  <span className="font-medium">{t('subscription.currentPlan')}:</span>{" "}
                   {user?.plan || "Free"} ({user?.price || "$0"}/{t('subscription.month')})
                </p>
              </div>
              <div className="flex space-x-2">
                <ManagePlanModal
                  currentPlan="Free"
                  trigger={
                    <Button variant="default" size="sm">
                      {t('subscription.manage')}
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle>{t('data.title')}</CardTitle>
              <CardDescription>
                {t('data.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleDeleteAccount}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('data.delete')}
              </Button>
            </CardContent>
          </Card>

          {/* Logout */}
          <div className="flex justify-center">
            <Button 
              onClick={handleLogout}
              variant="outline"
              size="lg"
              className="w-full max-w-md text-red-600 border-red-200 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('logout.button')}
            </Button>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}