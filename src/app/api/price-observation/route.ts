import { NextResponse } from 'next/server'
import { createServiceClient, getOrCreateShop } from '@/lib/supabase'
import { pushMirrorSafe } from '@/lib/whisky-sync'

// 시세 관측 목록 (특정 위스키)
export async function GET(req: Request) {
  const db = createServiceClient()
  const whisky_id = new URL(req.url).searchParams.get('whisky_id')
  let q = db.from('price_observation').select('*, shop:shop_id(name)').order('price')
  if (whisky_id) q = q.eq('whisky_id', whisky_id)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// 시세 관측 추가 (웹검색 수집분 적재: 트레이더스/코스트코/면세점 등)
// body: { whisky_id, items: [{ shop_name, price, source?, observed_on? }] } 또는 단건 필드
export async function POST(req: Request) {
  const db = createServiceClient()
  type Item = { shop_name?: string; price: number | string; source?: string; observed_on?: string; volume_ml?: number | string; url?: string; memo?: string }
  const body = (await req.json()) as {
    whisky_id?: string
    items?: Item[]
    shop_name?: string; price?: number | string; source?: string; observed_on?: string; volume_ml?: number | string; url?: string; memo?: string
  }
  if (!body.whisky_id) return NextResponse.json({ error: 'whisky_id required' }, { status: 400 })
  const items: Item[] = body.items ?? [{ shop_name: body.shop_name, price: body.price!, source: body.source, observed_on: body.observed_on, volume_ml: body.volume_ml, url: body.url, memo: body.memo }]

  const rows: Record<string, unknown>[] = []
  for (const it of items) {
    const priceInt = parseInt(String(it.price ?? '').replace(/[^0-9-]/g, ''))
    if (!priceInt) continue
    const shop_id = await getOrCreateShop(db, it.shop_name)
    const vol = it.volume_ml != null && String(it.volume_ml).trim() !== '' ? parseInt(String(it.volume_ml).replace(/[^0-9]/g, '')) : null
    rows.push({
      whisky_id: body.whisky_id,
      shop_id,
      price: priceInt,
      source: it.source ?? null,
      observed_on: it.observed_on ?? new Date().toISOString().slice(0, 10),
      volume_ml: vol,
      url: (it.url ?? '').trim() || null,
      memo: (it.memo ?? '').trim() || null,
    })
  }
  if (!rows.length) return NextResponse.json({ error: '유효한 가격 없음' }, { status: 400 })
  const { error } = await db.from('price_observation').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await pushMirrorSafe()
  return NextResponse.json({ ok: true, inserted: rows.length })
}

// 시세 관측 삭제
export async function DELETE(req: Request) {
  const db = createServiceClient()
  const { id, whisky_id } = (await req.json()) as { id?: string; whisky_id?: string }
  const db2 = db.from('price_observation').delete()
  if (id) { const { error } = await db2.eq('id', id); if (error) return NextResponse.json({ error: error.message }, { status: 500 }) }
  else if (whisky_id) { const { error } = await db2.eq('whisky_id', whisky_id); if (error) return NextResponse.json({ error: error.message }, { status: 500 }) }
  else return NextResponse.json({ error: 'id or whisky_id required' }, { status: 400 })
  await pushMirrorSafe()
  return NextResponse.json({ ok: true })
}
