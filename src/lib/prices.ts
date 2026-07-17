import { readPriceSheet } from '@/lib/sheets'

export type PriceRow = {
  liquor: string; style: string; cask: string; peat: string
  name: string; shop: string; price: number; date: string; volume: number | null; url: string; memo: string
}
export type CatalogItem = { name: string; liquor: string; style: string; cask: string; peat: string; priceMin: number | null }

// 주류시세 시트 파싱(헤더명 기준, 컬럼 순서 변동 안전)
export async function getPrices(): Promise<PriceRow[]> {
  const rows = await readPriceSheet()
  if (!rows.length) return []
  const header = rows[0].map((h) => (h ?? '').trim())
  const idx = (name: string) => header.indexOf(name)
  const iLiquor = idx('주종'), iStyle = idx('분류'), iCask = idx('캐스크'), iPeat = idx('피트')
  const iName = idx('한글명'), iShop = idx('판매점'), iPrice = idx('가격'), iDate = idx('기준일자')
  const iVol = idx('용량ml'), iUrl = idx('링크'), iMemo = idx('비고')
  const g = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').toString().trim() : '')
  const num = (s: string) => { const n = parseInt(s.replace(/[^0-9]/g, '')); return Number.isFinite(n) && n > 0 ? n : null }
  return rows.slice(1)
    .filter((r) => g(r, iName) && num(g(r, iPrice)))
    .map((r) => ({
      liquor: g(r, iLiquor), style: g(r, iStyle), cask: g(r, iCask), peat: g(r, iPeat),
      name: g(r, iName), shop: g(r, iShop), price: num(g(r, iPrice)) as number,
      date: g(r, iDate), volume: num(g(r, iVol)), url: g(r, iUrl), memo: g(r, iMemo),
    }))
}

// 한글명 기준 카탈로그(최신 기준일자의 속성 + 최저가) — 등록 시 선택용
export async function getCatalog(): Promise<CatalogItem[]> {
  const prices = await getPrices()
  const byName = new Map<string, { latest: PriceRow; min: number }>()
  for (const p of prices) {
    const cur = byName.get(p.name)
    if (!cur) { byName.set(p.name, { latest: p, min: p.price }); continue }
    if ((p.date || '').localeCompare(cur.latest.date || '') > 0) cur.latest = p
    if (p.price < cur.min) cur.min = p.price
  }
  return Array.from(byName.values())
    .map(({ latest, min }) => ({ name: latest.name, liquor: latest.liquor, style: latest.style, cask: latest.cask, peat: latest.peat, priceMin: min }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}
