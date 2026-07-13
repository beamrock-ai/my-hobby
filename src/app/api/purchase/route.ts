import { NextResponse } from 'next/server'
import { createServiceClient, getOrCreateShop } from '@/lib/supabase'
import { pushMirrorSafe } from '@/lib/whisky-sync'

// 구매완료 1건 추가
export async function POST(req: Request) {
  const db = createServiceClient()
  const { whisky_id, shop_name, purchase_date, price } = (await req.json()) as {
    whisky_id?: string; shop_name?: string; purchase_date?: string; price?: number | string
  }
  if (!whisky_id || !purchase_date) {
    return NextResponse.json({ error: 'whisky_id, purchase_date 필요' }, { status: 400 })
  }
  const shop_id = await getOrCreateShop(db, shop_name)
  const priceInt = price != null && String(price).trim() !== '' ? parseInt(String(price).replace(/[^0-9-]/g, '')) : null
  const { data, error } = await db
    .from('purchase')
    .insert({ whisky_id, shop_id, purchase_date, price: priceInt })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await pushMirrorSafe()
  return NextResponse.json(data)
}

// 구매 1건 삭제
export async function DELETE(req: Request) {
  const db = createServiceClient()
  const { id } = (await req.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await db.from('purchase').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await pushMirrorSafe()
  return NextResponse.json({ ok: true })
}
