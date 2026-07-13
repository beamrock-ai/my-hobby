import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { whiskyInfo } from '@/lib/translate'

const SUBJECTIVE = ['author', 'nose', 'palate', 'finish', 'aroma', 'flavour', 'evaluation', 'serving', 'color', 'rating', 'personal_note', 'tasted_on']

// 작성자(프로필) 추가
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = createServiceClient()
  const { author } = (await req.json()) as { author?: string }
  const name = (author ?? '').trim()
  if (!name) return NextResponse.json({ error: '작성자명을 입력하세요' }, { status: 400 })
  const { data, error } = await db.from('whisky_profile').insert({ whisky_id: id, author: name }).select().single()
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: '이미 있는 작성자입니다' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// 프로필 저장 / 재생성
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = createServiceClient()
  const body = (await req.json()) as Record<string, unknown>
  const profileId = body.profileId as string | undefined
  if (!profileId) return NextResponse.json({ error: 'profileId 필요' }, { status: 400 })

  // 재생성: 위스키 객관정보(공유) + 이 프로필의 주관 baseline 다시 채움
  if (body.regenerate) {
    const { data: w } = await db.from('whisky').select('name, name_ko, name_en').eq('id', id).single()
    const info = await whiskyInfo((w?.name_ko as string) || (w?.name_en as string) || (w?.name as string) || '')
    await db.from('whisky').update({ type: info.type, distillery: info.distillery, abv: info.abv, description: info.description }).eq('id', id)
    await db.from('whisky_profile').update({ nose: info.nose, palate: info.palate, finish: info.finish, aroma: info.aroma, flavour: info.flavour, evaluation: info.evaluation }).eq('id', profileId)
    return NextResponse.json({ ok: true, regenerated: true })
  }

  const patch: Record<string, unknown> = {}
  for (const k of SUBJECTIVE) if (k in body) patch[k] = body[k]
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true })
  const { error } = await db.from('whisky_profile').update(patch).eq('id', profileId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// 프로필(작성자) 삭제 — 마지막 하나는 삭제 방지
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = createServiceClient()
  const { profileId } = (await req.json()) as { profileId?: string }
  if (!profileId) return NextResponse.json({ error: 'profileId 필요' }, { status: 400 })
  const { count } = await db.from('whisky_profile').select('id', { count: 'exact', head: true }).eq('whisky_id', id)
  if ((count ?? 0) <= 1) return NextResponse.json({ error: '마지막 작성자는 삭제할 수 없습니다' }, { status: 400 })
  const { error } = await db.from('whisky_profile').delete().eq('id', profileId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
