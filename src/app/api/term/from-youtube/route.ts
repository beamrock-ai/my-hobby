import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { ytVideoId, fetchTranscript } from '@/lib/youtube'
import { extractWhiskyTerms } from '@/lib/translate'

// 유튜브 링크(+선택 자막)로 위스키 용어 일괄 추가
export async function POST(req: Request) {
  const db = createServiceClient()
  const { url, transcript } = (await req.json()) as { url?: string; transcript?: string }
  const vid = ytVideoId(url ?? '')
  if (!vid && !(transcript ?? '').trim()) return NextResponse.json({ error: '유효한 유튜브 링크 또는 자막이 필요합니다' }, { status: 400 })

  let text = (transcript ?? '').trim()
  if (!text && vid) text = (await fetchTranscript(vid)) ?? ''
  if (!text) return NextResponse.json({ needTranscript: true, error: '자막을 자동으로 가져오지 못했습니다(유튜브 차단). 영상 자막/내용을 붙여넣어 주세요.' })

  const terms = await extractWhiskyTerms(text)
  if (!terms.length) return NextResponse.json({ error: '내용에서 위스키 용어를 추출하지 못했습니다.' })

  const source = (url ?? '').trim() ? `YouTube: ${(url as string).trim()}` : '붙여넣은 자막'
  const rows = terms.map((t) => ({ term: t.term, term_en: t.term_en, category: t.category, definition: t.definition ?? '', source }))
  const { data, error } = await db.from('term').upsert(rows, { onConflict: 'term', ignoreDuplicates: true }).select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ added: data?.length ?? 0, extracted: terms.length })
}
