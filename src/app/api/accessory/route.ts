import { NextResponse } from 'next/server'
import { createServiceClient, uploadImage } from '@/lib/supabase'
import { accessoryInfo } from '@/lib/translate'

// 액세서리 전체 목록
export async function GET() {
  const db = createServiceClient()
  const { data, error } = await db.from('accessory').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ accessories: data ?? [] })
}

// 액세서리 등록 (multipart: name + 선택 category/brand/status/price/shop/memo + image)
export async function POST(req: Request) {
  const db = createServiceClient()
  const form = await req.formData()
  const name = String(form.get('name') ?? '').trim()
  if (!name) return NextResponse.json({ error: '품목명을 입력하세요' }, { status: 400 })

  const g = (k: string) => { const v = String(form.get(k) ?? '').trim(); return v || null }
  let category = g('category')
  let brand = g('brand')
  let description = g('description')

  // 분류·브랜드·설명 미입력 시 AI 자동 추정
  if (!category || !description) {
    const info = await accessoryInfo(name)
    category = category || info.category
    brand = brand || info.brand
    description = description || info.description
  }

  const priceRaw = g('price')
  const record: Record<string, unknown> = {
    name, category, brand, description,
    status: g('status') || '보유',
    price: priceRaw ? parseInt(priceRaw.replace(/[^0-9-]/g, '')) : null,
    shop: g('shop'),
    memo: g('memo'),
  }

  const file = form.get('image')
  if (file instanceof File && file.size > 0) {
    try { record.image_url = await uploadImage(db, file) } catch (e) {
      return NextResponse.json({ error: `이미지 업로드 실패: ${e instanceof Error ? e.message : ''}` }, { status: 500 })
    }
  }

  const { data, error } = await db.from('accessory').insert(record).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// 액세서리 삭제
export async function DELETE(req: Request) {
  const db = createServiceClient()
  const { id } = (await req.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await db.from('accessory').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
