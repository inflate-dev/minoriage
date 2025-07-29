// app/api/login/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const { email, password } = await req.json()

  const {
    data: { session },
    error,
  } = await supabase.auth.signInWithPassword({ email, password })


  if (error || !session?.user) {
    return NextResponse.json(
      { error: error?.message || 'Login failed' },
      { status: 401 }
    )
  }

   const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select(`
      company_id,
      company:companies (id, name)
    `)
    .eq('user_id', session.user.id)
    .single()

  if (profileError) {
    return NextResponse.json(
      { error: 'Failed to fetch profile info' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    session: {
      access_token: session.access_token,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: 'member',
        company: profileData.company,
      },
    },
  })
}
