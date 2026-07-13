'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

type Row = {
  id: string; name: string; name_ko: string | null; name_en: string | null; image_url: string | null
  liquor: string | null; style: string | null
  rating: number | null; neat: number | null; rocks: number | null; highball: number | null; ratingCount: number
}
type Metric = 'rating' | 'neat' | 'rocks' | 'highball'
// [키, 라벨, 아이콘]
const METRICS: [Metric, string, string][] = [
  ['rating', '평점', '🛢️'], ['neat', '니트', '🥃'], ['rocks', '온더락', '🧊'], ['highball', '하이볼', '🥤'],
]
const rankColor = ['text-amber-500', 'text-neutral-400', 'text-orange-400'] // 1·2·3위

// 0~5 값(0.5 단위) → 아이콘 5개(꽉/반/빈)
function IconRow({ value, icon }: { value: number; icon: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const on = value >= i
        const half = !on && value >= i - 0.5
        return <span key={i} className={`text-sm leading-none ${on ? 'opacity-100' : half ? 'opacity-100' : 'opacity-20 grayscale'}`} style={half ? { clipPath: 'inset(0 50% 0 0)' } : undefined}>{icon}</span>
      })}
      <span className="ml-1 text-sm font-semibold tabular-nums text-neutral-700">{value.toFixed(1)}</span>
    </span>
  )
}

export default function RankingPage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [metric, setMetric] = useState<Metric>('rating')
  const [fLiquor, setFLiquor] = useState('')

  useEffect(() => {
    void (async () => {
      const res = await fetch(`${BP}/api/ranking`)
      setRows((await res.json()).rankings ?? [])
    })()
  }, [])

  const liquorList = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.liquor).filter(Boolean))) as string[], [rows])

  const ranked = useMemo(() => {
    if (!rows) return []
    return rows
      .filter((r) => (fLiquor ? r.liquor === fLiquor : true))
      .filter((r) => typeof r[metric] === 'number' && (r[metric] as number) > 0)
      .sort((a, b) => (b[metric] as number) - (a[metric] as number))
  }, [rows, metric, fLiquor])

  const icon = METRICS.find((m) => m[0] === metric)![2]

  if (!rows) return <div className="text-sm text-neutral-400">불러오는 중...</div>

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-neutral-900">🏆 순위</h1>
      <p className="mt-1 text-sm text-neutral-500">평점(=니트/온더락/하이볼 평균) · 시음유형별 순위 (작성자 프로필 평균, 5점 만점)</p>

      {/* 지표 탭 */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {METRICS.map(([k, label, ic]) => (
          <button
            key={k}
            onClick={() => setMetric(k)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${metric === k ? 'bg-amber-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
          >{ic} {label}</button>
        ))}
        {liquorList.length > 1 && (
          <select value={fLiquor} onChange={(e) => setFLiquor(e.target.value)}
            className="ml-auto rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-500">
            <option value="">주종: 전체</option>
            {liquorList.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
      </div>

      {/* 순위 목록 */}
      <div className="mt-4 space-y-1.5">
        {ranked.length === 0 && <p className="text-sm text-neutral-400">아직 {METRICS.find((m) => m[0] === metric)![1]} 점수가 없습니다. {metric === 'rating' ? '(노트에서 니트/온더락/하이볼 점수를 매기면 평균으로 자동 산출됩니다)' : '(노트에서 시음유형 점수를 매겨주세요)'}</p>}
        {ranked.map((r, i, arr) => {
          // 표준 경쟁 순위: 동점이면 같은 순위(자기보다 높은 점수 개수 + 1)
          const rank = arr.filter((x) => (x[metric] as number) > (r[metric] as number)).length + 1
          return (
          <Link key={r.id} href={`/whisky/${r.id}`}
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 hover:border-amber-300 hover:bg-amber-50/40">
            <span className={`w-7 shrink-0 text-center text-lg font-bold tabular-nums ${rankColor[rank - 1] ?? 'text-neutral-300'}`}>{rank}</span>
            {r.image_url
              ? <img src={r.image_url} alt="" className="h-10 w-10 shrink-0 rounded-md border border-neutral-200 object-cover" />
              : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-lg">🍶</span>}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-neutral-900">{r.name_ko || r.name}</span>
                {r.liquor && <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-600">{r.liquor}</span>}
                {r.style && <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600">{r.style}</span>}
              </div>
            </div>
            <IconRow value={r[metric] as number} icon={icon} />
          </Link>
          )
        })}
      </div>
    </div>
  )
}
