import { NextResponse } from 'next/server'
import { createServiceClient, getOrCreateShop } from '@/lib/supabase'
import { pushMirrorSafe } from '@/lib/whisky-sync'

// 구매희망 등록/수정 (구매가능상점 목록 포함)
export async function POST(req: Request) {
  const db = createServiceClient()
  const { whisky_id, memo, shop_names } = (await req.json()) as {
    whisky_id?: string; memo?: string; shop_names?: string[]
  }
  if (!whisky_id) return NextResponse.json({ error: 'whisky_id required' }, { status: 400 })

  const { data: wl, error } = await db
    .from('wishlist')
    .upsert({ whisky_id, memo: memo ?? null }, { onConflict: 'whisky_id' })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 구매가능상점 재설정
  await db.from('wishlist_shop').delete().eq('wishlist_id', wl.id)
  const links: { wishlist_id: string; shop_id: string }[] = []
  for (const name of shop_names ?? []) {
    const shop_id = await getOrCreateShop(db, name)
    if (shop_id) links.push({ wishlist_id: wl.id as string, shop_id })
  }
  if (links.length) await db.from('wishlist_shop').insert(links)

  await pushMirrorSafe()
  return NextResponse.json({ ok: true, id: wl.id })
}

// 구매희망 해제
export async function DELETE(req: Request) {
  const db = createServiceClient()
  const { whisky_id } = (await req.json()) as { whisky_id?: string }
  if (!whisky_id) return NextResponse.json({ error: 'whisky_id required' }, { status: 400 })
  const { error } = await db.from('wishlist').delete().eq('whisky_id', whisky_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await pushMirrorSafe()
  return NextResponse.json({ ok: true })
}
