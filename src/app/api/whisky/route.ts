import { NextResponse } from 'next/server'
import { createServiceClient, uploadImage } from '@/lib/supabase'
import { whiskyInfo } from '@/lib/translate'
import { pullAdd, pushMirrorSafe } from '@/lib/whisky-sync'

// 위스키 전체 + 통계 + 각 카테고리 관계 데이터 (화면 렌더용)
export async function GET() {
  const db = createServiceClient()
  // 시트에 수동 추가된 위스키를 먼저 DB로 가져옴(시트→DB 자동 연동)
  await pullAdd(db).catch(() => {})
  const [whiskies, stats, purchases, wishlists, wishlistShops, recommendations, shops] = await Promise.all([
    db.from('whisky').select('*').order('name'),
    db.from('whisky_stats').select('*'),
    db.from('purchase').select('*, shop:shop_id(name)').order('purchase_date', { ascending: false }),
    db.from('wishlist').select('*'),
    db.from('wishlist_shop').select('*, shop:shop_id(name)'),
    db.from('recommendation').select('*, recommender:recommender_id(name, kind)').order('created_at', { ascending: false }),
    db.from('shop').select('*').order('name'),
  ])
  return NextResponse.json({
    whiskies: whiskies.data ?? [],
    stats: stats.data ?? [],
    purchases: purchases.data ?? [],
    wishlists: wishlists.data ?? [],
    wishlistShops: wishlistShops.data ?? [],
    recommendations: recommendations.data ?? [],
    shops: shops.data ?? [],
  })
}

// 위스키 생성 (이름 기준 upsert). multipart/form-data: name + 선택 image 파일.
export async function POST(req: Request) {
  const db = createServiceClient()
  const form = await req.formData()
  const n = String(form.get('name') ?? '').trim()
  if (!n) return NextResponse.json({ error: '위스키명을 입력하세요' }, { status: 400 })

  // 이름(한/영) + 종류·증류소·도수 + 설명·향/맛/피니시 + 향/맛 레이더 + 평가 자동 생성
  const info = await whiskyInfo(n)
  const canonical = info.name_ko || info.name_en || n // 표시/식별용(한글 우선)
  const liquorInput = String(form.get('liquor') ?? '').trim() // 주종 수동 지정(있으면 AI값 override)
  const styleInput = String(form.get('style') ?? '').trim() // 구분 수동 지정(있으면 AI값 override)
  // 객관 정보(공유)만 whisky에 저장. 주관 테이스팅은 beamrock 프로필로.
  const record: Record<string, unknown> = {
    name: canonical,
    name_ko: info.name_ko,
    name_en: info.name_en,
    liquor: liquorInput || info.liquor,
    type: info.type,
    style: styleInput || info.style,
    distillery: info.distillery,
    abv: info.abv,
    description: info.description,
  }

  // 선택 사진
  const file = form.get('image')
  let uploadedUrl: string | null = null
  if (file instanceof File && file.size > 0) {
    try { uploadedUrl = await uploadImage(db, file) } catch (e) {
      return NextResponse.json({ error: `이미지 업로드 실패: ${e instanceof Error ? e.message : ''}` }, { status: 500 })
    }
    record.image_url = uploadedUrl
  }

  const { data, error } = await db.from('whisky').upsert(record, { onConflict: 'name' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // 대표 이미지로 등록
  if (uploadedUrl && data) {
    await db.from('whisky_image').update({ is_primary: false }).eq('whisky_id', data.id)
    await db.from('whisky_image').insert({ whisky_id: data.id, url: uploadedUrl, is_primary: true })
  }
  // beamrock 기본 프로필(AI 주관 baseline) — 재등록 시 개인기록(serving/color/rating 등)은 보존
  if (data) {
    await db.from('whisky_profile').upsert(
      { whisky_id: data.id, author: 'beamrock', nose: info.nose, palate: info.palate, finish: info.finish, aroma: info.aroma, flavour: info.flavour, evaluation: info.evaluation },
      { onConflict: 'whisky_id,author' },
    )
  }
  await pushMirrorSafe() // webapp→시트 반영
  return NextResponse.json(data)
}

// 위스키 삭제 (연관 데이터 CASCADE)
export async function DELETE(req: Request) {
  const db = createServiceClient()
  const { id } = (await req.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await db.from('whisky').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await pushMirrorSafe() // webapp→시트 반영(삭제)
  return NextResponse.json({ ok: true })
}
