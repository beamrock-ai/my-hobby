import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 평점 / 시음유형(니트·온더락·하이볼)별 순위용 집계.
// rating·serving은 작성자별 프로필에 저장 → 위스키별 프로필 평균으로 집계.
export async function GET() {
  const db = createServiceClient()
  const [wq, pq] = await Promise.all([
    db.from('whisky').select('id, name, name_ko, name_en, image_url, liquor, style'),
    db.from('whisky_profile').select('whisky_id, rating, serving'),
  ])
  const whiskies = wq.data ?? []
  const profiles = (pq.data ?? []) as { whisky_id: string; rating: number | null; serving: Record<string, number> | null }[]
  const avg = (vals: number[]) => (vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null)

  const rankings = whiskies.map((w) => {
    const ps = profiles.filter((p) => p.whisky_id === w.id)
    const nums = (arr: (number | null | undefined)[]) => arr.filter((v): v is number => typeof v === 'number' && v > 0)
    const serv = (k: string) => nums(ps.map((p) => p.serving?.[k]))
    const neat = avg(serv('neat')), rocks = avg(serv('rocks')), highball = avg(serv('highball'))
    // 평점 = 니트/온더락/하이볼(입력된 것)의 평균. 저장된 rating은 무시.
    const present = [neat, rocks, highball].filter((v): v is number => typeof v === 'number')
    const rating = present.length ? Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 10) / 10 : null
    return {
      id: w.id, name: w.name, name_ko: w.name_ko, name_en: w.name_en, image_url: w.image_url, liquor: w.liquor, style: w.style,
      rating, neat, rocks, highball, ratingCount: present.length,
    }
  })
  return NextResponse.json({ rankings })
}
