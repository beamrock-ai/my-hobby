import { NextResponse } from 'next/server'
import { getCatalog } from '@/lib/prices'

// 주류시세 카탈로그(한글명별 대표 속성) — 노트 등록 시 선택용
export async function GET() {
  try {
    const catalog = await getCatalog()
    return NextResponse.json({ catalog })
  } catch (e) {
    return NextResponse.json({ catalog: [], error: e instanceof Error ? e.message : 'catalog fail' }, { status: 200 })
  }
}
