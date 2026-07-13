import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 용어 목록/검색: ?q=&category=
export async function GET(req: Request) {
  const db = createServiceClient()
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').replace(/[,()%*]/g, ' ').trim()
  const category = url.searchParams.get('category') ?? ''
  let query = db.from('term').select('*').order('category').order('term')
  if (category) query = query.eq('category', category)
  if (q) query = query.or(`term.ilike.%${q}%,term_en.ilike.%${q}%,definition.ilike.%${q}%`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ terms: data ?? [] })
}

// 용어 생성
export async function POST(req: Request) {
  const db = createServiceClient()
  const { term, term_en, category, definition, source } = (await req.json()) as Record<string, string>
  if (!(term ?? '').trim() || !(definition ?? '').trim()) return NextResponse.json({ error: '용어와 설명은 필수입니다' }, { status: 400 })
  const { data, error } = await db.from('term').insert({
    term: term.trim(), term_en: term_en?.trim() || null, category: category?.trim() || null,
    definition: definition.trim(), source: source?.trim() || null,
  }).select().single()
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: '이미 있는 용어입니다' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
