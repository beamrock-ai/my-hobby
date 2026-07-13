import { NextResponse } from 'next/server'
import { createServiceClient, uploadImage } from '@/lib/supabase'

// 용어 이미지 첨부 (multipart 'image')
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
  await db.from('term').update({ image_url: url }).eq('id', id)
  return NextResponse.json({ ok: true, url })
}

// 이미지 제거
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = createServiceClient()
  await db.from('term').update({ image_url: null }).eq('id', id)
  return NextResponse.json({ ok: true })
}
