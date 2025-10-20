import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ?? '2025-10-01'
  const to = searchParams.get('to') ?? '2025-10-04'

  const { data, error } = await supabase
    .from('detections')
    .select('object_type, created_at')
    .gte('created_at', from)
    .lte('created_at', to)
    .eq('user_id', user.id ?? '') // user_id指定されたときのみ

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 日付ごと、object_typeごとに集計
  const summary: Record<string, Record<string, number>> = {}

  for (const row of data) {
    const date = new Date(row.created_at).toISOString().slice(0, 10)
    const type = row.object_type

    if (!summary[date]) summary[date] = {}
    if (!summary[date][type]) summary[date][type] = 0

    summary[date][type] += 1
  }

  const result = Object.entries(summary).map(([date, items]) => ({
    date,
    items,
  }))

  return NextResponse.json(result)
}