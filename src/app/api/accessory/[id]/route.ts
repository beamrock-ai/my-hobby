import { NextResponse } from 'next/server'
import { createServiceClient, uploadImage } from '@/lib/supabase'

const EDITABLE = ['name', 'category', 'brand', 'status', 'price', 'shop', 'description', 'memo']

// 편집: JSON(텍스트 필드) 또는 multipart(image 교체)
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const db = createServiceClient()
  const ct = req.headers.get('content-type') ?? ''
  const patch: Record<string, unknown> = {}

  if (ct.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('image')
    if (file instanceof File && file.size > 0) {
      try { patch.image_url = await uploadImage(db, file) } catch (e) {
        return NextResponse.json({ error: `이미지 업로드 실패: ${e instanceof Error ? e.message : ''}` }, { status: 500 })
      }
    }
  } else {
    const body = (await req.json()) as Record<string, unknown>
    for (const k of EDITABLE) if (k in body) patch[k] = k === 'price' ? (body[k] ? parseInt(String(body[k]).replace(/[^0-9-]/g, '')) : null) : body[k]
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true })
  patch.updated_at = new Date().toISOString()
  const { error } = await db.from('accessory').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
