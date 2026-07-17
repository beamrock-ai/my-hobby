import { NextResponse } from 'next/server'
import { getPrices } from '@/lib/prices'
import { createServiceClient } from '@/lib/supabase'

// 주류시세 시트 → 파싱 + DB(liquor_price) 미러 후 반환
export async function GET() {
  let prices
  try {
    prices = await getPrices()
  } catch (e) {
    return NextResponse.json({ prices: [], error: e instanceof Error ? e.message : 'sheet read fail' }, { status: 200 })
  }

  // 시트=원본 → DB(liquor_price) 미러 적재(best-effort)
  try {
    const db = createServiceClient()
    await db.from('liquor_price').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (prices.length) {
      await db.from('liquor_price').insert(prices.map((p) => ({
        liquor: p.liquor || null, style: p.style || null, cask: p.cask || null, peat: p.peat || null,
        name: p.name, shop: p.shop || null, price: p.price,
        observed_on: /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : null,
        volume_ml: p.volume, url: p.url || null, memo: p.memo || null,
      })))
    }
  } catch (e) {
    console.error('[price-sheet] liquor_price 적재 실패:', e)
  }

  return NextResponse.json({ prices })
}
