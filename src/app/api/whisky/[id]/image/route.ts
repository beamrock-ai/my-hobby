import { NextResponse } from 'next/server'
import { createServiceClient, uploadImage } from '@/lib/supabase'
import { pushMirrorSafe } from '@/lib/whisky-sync'

// 이미지 추가 (multipart 'image'). 대표가 없으면 이 이미지를 대표로.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = createServiceClient()
  const form = await req.formData()
  const file = form.get('image')
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: '이미지 파일이 필요합니다' }, { status: 400 })

  let url: string
  try { url = await uploadImage(db, file) } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '업로드 실패' }, { status: 500 })
  }
  const { data: prim } = await db.from('whisky_image').select('id').eq('whisky_id', id).eq('is_primary', true).maybeSingle()
  const isPrimary = !prim
  const { data, error } = await db.from('whisky_image').insert({ whisky_id: id, url, is_primary: isPrimary }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (isPrimary) await db.from('whisky').update({ image_url: url }).eq('id', id)
  await pushMirrorSafe()
  return NextResponse.json(data)
}

// 대표 사진 설정 (body {imageId})
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = createServiceClient()
  const { imageId } = (await req.json()) as { imageId?: string }
  if (!imageId) return NextResponse.json({ error: 'imageId 필요' }, { status: 400 })
  await db.from('whisky_image').update({ is_primary: false }).eq('whisky_id', id)
  await db.from('whisky_image').update({ is_primary: true }).eq('id', imageId)
  const { data: img } = await db.from('whisky_image').select('url').eq('id', imageId).single()
  await db.from('whisky').update({ image_url: img?.url ?? null }).eq('id', id)
  await pushMirrorSafe()
  return NextResponse.json({ ok: true })
}

// 이미지 삭제 (body {imageId}). 대표를 지우면 다른 이미지를 대표로 승격.
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = createServiceClient()
  const { imageId } = (await req.json()) as { imageId?: string }
  if (!imageId) return NextResponse.json({ error: 'imageId 필요' }, { status: 400 })
  const { data: img } = await db.from('whisky_image').select('is_primary').eq('id', imageId).single()
  await db.from('whisky_image').delete().eq('id', imageId)
  if (img?.is_primary) {
    const { data: next } = await db.from('whisky_image').select('id, url').eq('whisky_id', id).order('created_at').limit(1).maybeSingle()
    if (next) {
      await db.from('whisky_image').update({ is_primary: true }).eq('id', next.id)
      await db.from('whisky').update({ image_url: next.url }).eq('id', id)
    } else {
      await db.from('whisky').update({ image_url: null }).eq('id', id)
    }
  }
  await pushMirrorSafe()
  return NextResponse.json({ ok: true })
}
