'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

export default function SignUpPage() {
  const t = useTranslations('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useAppStore((state) => state.setUser);
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (password !== confirmPassword) {
      toast.error(t('toastPasswordMismatch'))
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      const user_id = data.user?.id;

      let company_id: string | null = null

      if (company.trim() !== '') {
        // check if company exists
        const { data: existingCompanies, error: companySelectError } = await supabase
          .from('companies')
          .select('id')
          .eq('name', company.trim())
          .limit(1)

        if (companySelectError) throw companySelectError

        if (existingCompanies.length > 0) {
          company_id = existingCompanies[0].id
        } else {
          const { data: newCompany, error: companyInsertError } = await supabase
            .from('companies')
            .insert([{ name: company.trim() }])
            .select('id')
            .single()

          if (companyInsertError) throw companyInsertError

          company_id = newCompany.id
        }
      }

      // ④ プロフィール情報をprofilesテーブルに保存
      const { error: profileInsertError } = await supabase
        .from('profiles')
        .insert([{
          user_id,
          company_id, // 任意なので null でもOK
          full_name: name,
        }])

      if (profileInsertError) throw profileInsertError;

      toast.success(t('toastCreate'));
      setUser(data.user);
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message || t('toastSignupFail'));
    } finally {
      setLoading(false);
    }
  }

  const handleSignIn = () => {
    router.push('/login')
  } 

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <Label>{t("name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>{t("companyName")}</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} required />
            </div>
            <div>
              <Label>{t("email")}</Label>
              <Input type="email" value={email} placeholder={t("placeholderEmail")} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>{t("password")}</Label>
              <Input type="password" value={password} placeholder={t("enterPassword")} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <Label>{t("confirmPassword")}</Label>
              <Input type="password" value={confirmPassword} placeholder={t("enterConfirmPassword")} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {t("signupBtn")}
            </Button>
            <Button variant="link" className="w-full" onClick={handleSignIn} disabled={loading}>
              {t("haveAccount")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}