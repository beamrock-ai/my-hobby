import Anthropic from '@anthropic-ai/sdk'

export type Radar = { cereal: number; fruity: number; floral: number; peaty: number; feinty: number; sulphur: number; woody: number; winey: number }
// 주종(최상위 분류) / 위스키 구분(세부 스타일). UI/LLM 공통.
export const LIQUORS = ['위스키', '보드카', '진', '럼', '데킬라', '브랜디', '리큐르', '사케', '막걸리', '소주', '전통주', '와인', '맥주', '기타'] as const
export const WHISKY_STYLES = ['싱글몰트', '블렌디드', '블렌디드몰트', '싱글그레인', '버번', '라이', '기타'] as const
export type WhiskyStyle = (typeof WHISKY_STYLES)[number]

export type WhiskyInfo = {
  name_ko: string | null
  name_en: string | null
  liquor: string | null
  type: string | null
  style: string | null
  distillery: string | null
  abv: number | null
  description: string | null
  nose: string | null
  palate: string | null
  finish: string | null
  aroma: Radar | null
  flavour: Radar | null
  evaluation: string | null
}

const EMPTY: WhiskyInfo = {
  name_ko: null, name_en: null, liquor: null, type: null, style: null, distillery: null, abv: null,
  description: null, nose: null, palate: null, finish: null, aroma: null, flavour: null, evaluation: null,
}

function toRadar(o: unknown): Radar | null {
  if (!o || typeof o !== 'object') return null
  const rec = o as Record<string, unknown>
  const g = (k: string) => {
    const v = rec[k]
    const n = typeof v === 'number' ? v : parseFloat(String(v))
    return Number.isFinite(n) ? Math.max(0, Math.min(4, Math.round(n))) : 0
  }
  return { cereal: g('cereal'), fruity: g('fruity'), floral: g('floral'), peaty: g('peaty'), feinty: g('feinty'), sulphur: g('sulphur'), woody: g('woody'), winey: g('winey') }
}

// 주류명(한/영) → 표준명 + 주종·종류·증류소·도수 + 설명 + 향/맛/피니시 + 향/맛 레이더 + 평가 (1회 LLM 호출)
export async function whiskyInfo(input: string): Promise<WhiskyInfo> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return EMPTY
  try {
    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1300,
      messages: [
        {
          role: 'user',
          content:
            `주류(술) "${input}"의 테이스팅 노트 정보를 JSON 하나로만 출력(설명·코드펜스 금지, 한국어).\n` +
            `{\n` +
            `"name_ko": 표준 한글명, "name_en": 표준 영문명,\n` +
            `"liquor": 주종(반드시 다음 중 하나: 위스키/보드카/진/럼/데킬라/브랜디/리큐르/사케/막걸리/소주/전통주/와인/맥주/기타),\n` +
            `"type": 세부 종류(예: 싱글몰트 스카치, 아일라 진, 아마로),\n` +
            `"style": 위스키 세부구분(위스키일 때만 다음 중 하나: 싱글몰트/블렌디드/블렌디드몰트/싱글그레인/버번/라이/기타, 위스키가 아니면 "해당없음"),\n` +
            `"distillery": 증류소/양조장·지역(예: 아드벡, 아일라, 스코틀랜드), "abv": 도수 숫자만(%),\n` +
            `"description": 기본 설명 2~3문장,\n` +
            `"nose": 향, "palate": 맛(입안), "finish": 피니시(여운),\n` +
            `"aroma": {"cereal":0~4,"fruity":0~4,"floral":0~4,"peaty":0~4,"feinty":0~4,"sulphur":0~4,"woody":0~4,"winey":0~4} (향 프로파일 강도),\n` +
            `"flavour": {동일한 8개 키, 맛 프로파일 강도},\n` +
            `"evaluation": 대체적 평가 1~2문장\n` +
            `}\n잘 모르는 제품이면 명칭 기준으로 추정하되 불확실하면 evaluation에 짧게 명시.`,
        },
      ],
    })
    const block = msg.content.find((b) => b.type === 'text')
    const text = block && block.type === 'text' ? block.text : ''
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return EMPTY
    const p = JSON.parse(m[0]) as Record<string, unknown>
    const s = (v: unknown) => {
      const t = (v == null ? '' : String(v)).trim()
      return t || null
    }
    const num = (v: unknown) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.]/g, ''))
      return Number.isFinite(n) ? n : null
    }
    return {
      name_ko: s(p.name_ko), name_en: s(p.name_en), liquor: s(p.liquor),
      type: s(p.type), style: s(p.style) === '해당없음' ? null : s(p.style), distillery: s(p.distillery), abv: num(p.abv),
      description: s(p.description), nose: s(p.nose), palate: s(p.palate), finish: s(p.finish),
      aroma: toRadar(p.aroma), flavour: toRadar(p.flavour),
      evaluation: s(p.evaluation),
    }
  } catch {
    return EMPTY
  }
}

export type ExtractedTerm = { term: string; term_en: string | null; category: string | null; definition: string | null }

// 자막/텍스트에서 위스키 용어 추출
export async function extractWhiskyTerms(text: string): Promise<ExtractedTerm[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return []
  try {
    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 3500,
      messages: [
        {
          role: 'user',
          content:
            `다음은 위스키 관련 영상의 자막/내용이다. 여기서 다루는 위스키 용어를 추출해 JSON 배열로만 출력(설명·코드펜스 금지).\n` +
            `각 항목: {"term":"한글 용어","term_en":"영문/원어","category":"분류|생산·증류|숙성·캐스크|병입·표기|테이스팅 중 하나","definition":"한국어 간단 설명 1문장"}\n` +
            `내용에 실제 등장하거나 직접 관련된 위스키 용어만. 중복 제거. 최대 40개.\n\n자막/내용:\n${text.slice(0, 14000)}`,
        },
      ],
    })
    const block = msg.content.find((b) => b.type === 'text')
    const t = block && block.type === 'text' ? block.text : ''
    const m = t.match(/\[[\s\S]*\]/)
    if (!m) return []
    const arr = JSON.parse(m[0]) as Record<string, unknown>[]
    const s = (v: unknown) => { const x = (v == null ? '' : String(v)).trim(); return x || null }
    return arr
      .filter((x) => x && String(x.term ?? '').trim())
      .map((x) => ({ term: String(x.term).trim(), term_en: s(x.term_en), category: s(x.category), definition: s(x.definition) }))
  } catch {
    return []
  }
}
