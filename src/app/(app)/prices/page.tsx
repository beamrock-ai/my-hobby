'use client'

import { useEffect, useMemo, useState } from 'react'

const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const won = (n: number | null | undefined) => (n == null ? '-' : `${n.toLocaleString()}원`)

type Price = {
  liquor: string; style: string; cask: string; peat: string
  name: string; shop: string; price: number; date: string; volume: number | null; url: string; memo: string
}
type SortKey = 'price' | 'name' | 'date'

export default function PricesPage() {
  const [prices, setPrices] = useState<Price[] | null>(null)
  const [q, setQ] = useState('')
  const [fLiquor, setFLiquor] = useState('')
  const [fStyle, setFStyle] = useState('')
  const [fShop, setFShop] = useState('')
  const [fPeat, setFPeat] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('price')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState<string | null>(null) // 드릴다운: 특정 주류
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  // 구글시트[주류시세] → 조회 + DB(liquor_price) 미러 적재. manual=버튼 클릭(피드백 표시)
  const load = async (manual = false) => {
    if (manual) { setSyncing(true); setSyncMsg('') }
    try {
      const res = await fetch(`${BP}/api/price-sheet`, { cache: 'no-store' })
      const j = await res.json()
      const list: Price[] = j.prices ?? []
      setPrices(list)
      if (manual) setSyncMsg(j.error ? `동기화 실패: ${j.error}` : `${list.length.toLocaleString()}건 동기화 완료`)
    } catch {
      if (manual) setSyncMsg('동기화 실패: 네트워크 오류')
    } finally {
      if (manual) setSyncing(false)
    }
  }

  useEffect(() => { void load() }, [])

  const { liquors, styles, shops, peats, names } = useMemo(() => {
    const set = (key: keyof Price) => Array.from(new Set((prices ?? []).map((p) => String(p[key] ?? '').trim()).filter(Boolean))).sort()
    return { liquors: set('liquor'), styles: set('style'), shops: set('shop'), peats: set('peat'), names: set('name') }
  }, [prices])

  const rows = useMemo(() => {
    if (!prices) return []
    const cmp = (a: Price, b: Price) => {
      let v = 0
      if (sortKey === 'price') v = a.price - b.price
      else if (sortKey === 'name') v = a.name.localeCompare(b.name, 'ko')
      else v = (a.date || '').localeCompare(b.date || '')
      return sortDir === 'asc' ? v : -v
    }
    const filtered = prices
      .filter((p) => (q.trim() ? p.name.toLowerCase().includes(q.trim().toLowerCase()) : true))
      .filter((p) => (fLiquor ? p.liquor === fLiquor : true))
      .filter((p) => (fStyle ? p.style === fStyle : true))
      .filter((p) => (fShop ? p.shop === fShop : true))
      .filter((p) => (fPeat ? p.peat === fPeat : true))
    // 한글명 기준 1건: 최신 기준일자(동일자면 최저가) 대표만
    const byName = new Map<string, Price>()
    for (const p of filtered) {
      const cur = byName.get(p.name)
      if (!cur) { byName.set(p.name, p); continue }
      const d = (p.date || '').localeCompare(cur.date || '')
      if (d > 0 || (d === 0 && p.price < cur.price)) byName.set(p.name, p)
    }
    return Array.from(byName.values()).sort(cmp)
  }, [prices, q, fLiquor, fStyle, fShop, fPeat, sortKey, sortDir])

  const setSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir(k === 'price' ? 'asc' : 'asc') }
  }
  const arrow = (k: SortKey) => (sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')

  const filterOn = !!(q || fLiquor || fStyle || fShop || fPeat)
  const sel = 'rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-500'
  const sortBtn = (k: SortKey, label: string) =>
    <button onClick={() => setSort(k)} className={`rounded-md px-2.5 py-1 text-xs font-medium ${sortKey === k ? 'bg-amber-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>{label}{arrow(k)}</button>

  if (!prices) return <div className="text-sm text-neutral-400">불러오는 중...</div>

  // 드릴다운: 선택된 주류의 기준일자 × 판매점 가격표
  if (selected) {
    const det = prices.filter((p) => p.name === selected)
    const shopList = Array.from(new Set(det.map((d) => d.shop || '상점미상'))).sort()
    const dateList = Array.from(new Set(det.map((d) => d.date || '-'))).sort()
    const cell = (shop: string, date: string) => det.find((d) => (d.shop || '상점미상') === shop && (d.date || '-') === date)?.price ?? null
    const attr = det[0]
    const vals = det.map((d) => d.price)
    const mn = Math.min(...vals), mx = Math.max(...vals), avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    return (
      <div className="mx-auto max-w-3xl">
        <button onClick={() => setSelected(null)} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-amber-300 hover:bg-amber-50">← 주류시세 목록</button>
        <h1 className="mt-3 text-2xl font-semibold text-neutral-900">{selected}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {attr.liquor && <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-600">{attr.liquor}</span>}
          {attr.style && <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600">{attr.style}</span>}
          {attr.cask && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">{attr.cask}</span>}
          {attr.peat === '피트' && <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[11px] text-orange-700">피트</span>}
          {attr.volume && <span className="text-[11px] text-neutral-400">{attr.volume}ml</span>}
        </div>
        <div className="mt-2 text-sm text-neutral-600">최저 <b className="text-neutral-900">{won(mn)}</b> · 평균 {won(avg)} · 최고 {won(mx)} <span className="text-xs text-neutral-400">({det.length}건)</span></div>

        {/* 일자별·판매점별 가격 추이 */}
        <PriceTrendChart rows={det.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date))} />

        <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-50">
                <th className="sticky left-0 z-10 border-b border-r border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-medium text-neutral-600">판매점＼일자</th>
                {dateList.map((d) => <th key={d} className="border-b border-neutral-200 px-3 py-2 text-right font-medium text-neutral-600 whitespace-nowrap">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {shopList.map((shop) => (
                <tr key={shop} className="odd:bg-white even:bg-neutral-50/40">
                  <td className="sticky left-0 z-10 border-r border-neutral-200 bg-inherit px-3 py-2 font-medium text-neutral-800 whitespace-nowrap">{shop}</td>
                  {dateList.map((d) => {
                    const v = cell(shop, d)
                    const isMin = v != null && v === mn
                    return <td key={d} className={`px-3 py-2 text-right tabular-nums ${v == null ? 'text-neutral-300' : isMin ? 'font-bold text-emerald-600' : 'text-neutral-800'}`}>{v == null ? '-' : v.toLocaleString()}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {det.some((d) => d.memo || d.url) && (
          <div className="mt-2 space-y-0.5 text-[11px] text-neutral-400">
            {det.filter((d) => d.memo || d.url).map((d, i) => (
              <div key={i}>· {d.shop} {d.date}: {d.memo}{d.url && <> <a href={d.url} target="_blank" rel="noreferrer" className="text-amber-600 hover:underline">🔗출처</a></>}</div>
            ))}
          </div>
        )}
        <button onClick={() => setSelected(null)} className="mt-4 inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-amber-300 hover:bg-amber-50">← 주류시세 목록으로</button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-neutral-900">🏷️ 시세</h1>
          <p className="mt-1 text-sm text-neutral-500">주류명별 최신 시세 1건. 주류명을 누르면 해당 술의 일자×장소 전체 가격표. 데이터=구글시트 [주류시세].</p>
        </div>
        <button
          onClick={() => void load(true)}
          disabled={syncing}
          title="구글시트[주류시세]를 다시 읽어 DB(liquor_price)에 반영합니다"
          className="mt-1 shrink-0 inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {syncing ? '⏳ 동기화 중…' : '🔄 시트 동기화'}
        </button>
      </div>
      {syncMsg && (
        <p className={`mt-2 text-xs ${syncMsg.startsWith('동기화 실패') ? 'text-red-600' : 'text-emerald-600'}`}>{syncMsg}</p>
      )}

      {/* 필터 */}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
        <input list="price-name-list" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 주류명 선택/검색 (전체)"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
        <datalist id="price-name-list">
          {names.map((n) => <option key={n} value={n} />)}
        </datalist>
        <div className="mt-2 flex flex-wrap gap-2">
          <select value={fLiquor} onChange={(e) => setFLiquor(e.target.value)} className={sel}>
            <option value="">주종: 전체</option>
            {liquors.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={fStyle} onChange={(e) => setFStyle(e.target.value)} className={sel}>
            <option value="">분류: 전체</option>
            {styles.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={fShop} onChange={(e) => setFShop(e.target.value)} className={sel}>
            <option value="">판매점: 전체</option>
            {shops.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {peats.length > 0 && (
            <select value={fPeat} onChange={(e) => setFPeat(e.target.value)} className={sel}>
              <option value="">피트: 전체</option>
              {peats.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          {filterOn && <button onClick={() => { setQ(''); setFLiquor(''); setFStyle(''); setFShop(''); setFPeat('') }}
            className="rounded-md border border-neutral-300 bg-white px-2.5 py-2 text-xs text-neutral-500 hover:bg-neutral-100">초기화</button>}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[11px] text-neutral-500">정렬:</span>
          {sortBtn('price', '가격')}{sortBtn('name', '이름')}{sortBtn('date', '일자')}
          <span className="ml-auto text-[11px] text-neutral-500">{rows.length}종 · 전체 {prices.length}건</span>
        </div>
      </div>

      {/* 목록 */}
      <div className="mt-4 space-y-1.5">
        {rows.length === 0 && <p className="text-sm text-neutral-400">조건에 맞는 시세가 없습니다.</p>}
        {rows.map((p, i) => {
          const perMl = p.volume ? Math.round(p.price / p.volume) : null
          return (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
              <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-neutral-300">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button onClick={() => setSelected(p.name)} className="text-sm font-semibold text-neutral-900 hover:text-amber-700 hover:underline">{p.name}</button>
                  {p.liquor && <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-600">{p.liquor}</span>}
                  {p.style && <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600">{p.style}</span>}
                  {p.cask && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">{p.cask}</span>}
                  {p.peat === '피트' && <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[11px] text-orange-700">피트</span>}
                </div>
                <div className="mt-0.5 text-xs text-neutral-500">
                  {p.shop || '상점미상'}{p.volume ? ` · ${p.volume}ml` : ''}{p.date ? ` · ${p.date}` : ''}
                  {p.url && <> · <a href={p.url} target="_blank" rel="noreferrer" className="text-amber-600 hover:underline">🔗</a></>}
                  {p.memo && <span className="text-neutral-400"> · {p.memo}</span>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-bold text-neutral-900">{won(p.price)}</div>
                {perMl && <div className="text-[10px] text-neutral-400">{perMl.toLocaleString()}원/ml</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 일자별·판매점별 가격 추이 (무의존 SVG 라인차트)
const CHART_COLORS = ['#d97706', '#2563eb', '#059669', '#db2777', '#7c3aed', '#dc2626', '#0891b2', '#65a30d']
function PriceTrendChart({ rows }: { rows: { shop: string; date: string; price: number }[] }) {
  if (!rows.length) return null
  const dates = Array.from(new Set(rows.map((r) => r.date))).sort()
  const shops = Array.from(new Set(rows.map((r) => r.shop || '상점미상'))).sort()
  const prices = rows.map((r) => r.price)
  let min = Math.min(...prices), max = Math.max(...prices)
  if (min === max) { min = Math.max(0, min - Math.round(min * 0.05) - 1); max = max + Math.round(max * 0.05) + 1 }

  const W = 640, H = 280, L = 68, R = 16, T = 16, B = 44
  const pw = W - L - R, ph = H - T - B
  const xAt = (i: number) => (dates.length === 1 ? L + pw / 2 : L + (pw * i) / (dates.length - 1))
  const yAt = (v: number) => T + ph * (1 - (v - min) / (max - min))
  const priceOf = (shop: string, date: string) => rows.find((r) => (r.shop || '상점미상') === shop && r.date === date)?.price ?? null
  const fmt = (n: number) => (n >= 10000 ? `${Math.round(n / 1000).toLocaleString()}천` : n.toLocaleString())
  const grid = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-3">
      <div className="mb-1 text-xs font-medium text-neutral-500">일자별·판매점별 가격 추이</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="가격 추이 그래프">
        {/* Y 그리드 + 라벨 */}
        {grid.map((g) => {
          const y = T + ph * g
          const v = max - (max - min) * g
          return (
            <g key={g}>
              <line x1={L} y1={y} x2={W - R} y2={y} stroke="#f1f1f1" strokeWidth={1} />
              <text x={L - 6} y={y + 3} textAnchor="end" fontSize={10} fill="#9ca3af">{fmt(Math.round(v))}</text>
            </g>
          )
        })}
        {/* X 라벨 */}
        {dates.map((d, i) => (
          <text key={d} x={xAt(i)} y={H - B + 16} textAnchor="middle" fontSize={10} fill="#6b7280">{d.slice(5)}</text>
        ))}
        {/* 판매점별 라인 + 점 */}
        {shops.map((shop, si) => {
          const color = CHART_COLORS[si % CHART_COLORS.length]
          const pts = dates.map((d, i) => { const v = priceOf(shop, d); return v == null ? null : { x: xAt(i), y: yAt(v), v } })
          const segs: { x: number; y: number }[][] = []
          let cur: { x: number; y: number }[] = []
          for (const p of pts) { if (p) cur.push(p); else if (cur.length) { segs.push(cur); cur = [] } }
          if (cur.length) segs.push(cur)
          return (
            <g key={shop}>
              {segs.map((seg, k) => seg.length > 1 && (
                <polyline key={k} points={seg.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={2} />
              ))}
              {pts.map((p, i) => p && <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />)}
            </g>
          )
        })}
      </svg>
      {/* 범례 */}
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {shops.map((shop, si) => (
          <span key={shop} className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[si % CHART_COLORS.length] }} />{shop}
          </span>
        ))}
      </div>
    </div>
  )
}
