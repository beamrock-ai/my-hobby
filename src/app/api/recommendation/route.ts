import { NextResponse } from 'next/server'
import { createServiceClient, getOrCreateRecommender } from '@/lib/supabase'
import { pushMirrorSafe } from '@/lib/whisky-sync'

// 추천 추가 (지인추천 kind=friend / 전문가추천 kind=expert / 직접촬영 kind=photo)
export async function POST(req: Request) {
  const db = createServiceClient()
  const { whisky_id, kind, name, reason } = (await req.json()) as {
    whisky_id?: string; kind?: 'friend' | 'expert' | 'gift' | 'photo'; name?: string; reason?: string
  }
  if (!whisky_id || !kind || (kind !== 'photo' && !(name ?? '').trim())) {
    return NextResponse.json({ error: 'whisky_id, kind, name(지인명/출처) 필요' }, { status: 400 })
  }
  const recommender_id = await getOrCreateRecommender(db, (name ?? '').trim() || '직접촬영', kind)
  const { data, error } = await db
    .from('recommendation')
    .insert({ whisky_id, recommender_id, reason: reason ?? null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await pushMirrorSafe()
  return NextResponse.json(data)
}

// 추천 삭제
export async function DELETE(req: Request) {
  const db = createServiceClient()
  const { id } = (await req.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await db.from('recommendation').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await pushMirrorSafe()
  return NextResponse.json({ ok: true })
}
