export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { DateTime } from 'luxon';
import { cookies } from 'next/headers'

type InventorySummaryResponse = {
  confirmed_at: string;
  inventory_detections: {
    quantity: number;
    detection_id: string;
    detections: {
      object_type: string;
    } | null; // ← ここが超重要！！「1件 or null」だよ！
  }[];
}[];

export async function GET(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // クエリパラメータから from / to を取得
  const { searchParams } = new URL(req.url)
  const rawFrom  = searchParams.get('from') ?? '2025-10-01'
  const rawTo = searchParams.get('to') ?? '2025-10-04'
  const timeZone = searchParams.get('tz') || 'Asia/Tokyo';

  if (!rawFrom  || !rawTo) {
    return NextResponse.json({ error: 'Missing date range' }, { status: 400 })
  }
  // タイムゾーンに応じたUTCの境界時間を生成
  const from = DateTime.fromISO(rawFrom, { zone: timeZone }).startOf('day').toUTC().toISO();
  const to = DateTime.fromISO(rawTo, { zone: timeZone }).endOf('day').toUTC().toISO();

  const { data, error } = (await supabase
    .from('inventory')
    .select(`
      confirmed_at,
      inventory_detections (
        quantity,
        detection_id,
        detections!detection_id (object_type)
      )
    `)
    .gte('confirmed_at', from)
    .lt('confirmed_at', to)
    .eq('user_id', user.id)
  ) as { data: InventorySummaryResponse | null; error: any }

  if (error) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 日付 x object_typeごとに集計
  const grouped: Record<string, Record<string, number>> = {}

  if (!data) {
    return NextResponse.json({ error: 'No data found' }, { status: 404 });
  }

  for (const inv of data) {
    const date = new Date(inv.confirmed_at).toISOString().slice(0, 10)
    for (const item of inv.inventory_detections || []) {
      const type = item.detections?.object_type || 'Unknown'
      const qty = item.quantity || 0
      if (!grouped[date]) grouped[date] = {}
      grouped[date][type] = (grouped[date][type] || 0) + qty
    }
  }

  const result = Object.entries(grouped).map(([date, items]) => ({
    date,
    items,
  }))

  return NextResponse.json(result)
}