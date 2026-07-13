// 유튜브 링크 → 영상ID / 자막(자동수집, 다중 전략).
// 주의: 이 서버(Azure 데이터센터 IP)는 유튜브가 봇으로 차단하므로 무쿠키 직접경로는 대부분 실패한다.
// 유일하게 안정적인 경로는 yt-dlp + 쿠키(YT_COOKIES_PATH). 그 외 경로도 순차 시도하고, 모두 실패하면 null(→ 붙여넣기 폴백).
import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { mkdtemp, readFile, readdir, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const pexec = promisify(execFile)
const YTDLP = process.env.YTDLP_PATH || '/home/beamrock/.local/bin/yt-dlp'
const COOKIES = process.env.YT_COOKIES_PATH || '' // Netscape cookies.txt (있으면 차단 우회)

export function ytVideoId(url: string): string | null {
  const m = (url ?? '').match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

// WEBVTT/json3/srt → 순수 텍스트(중복 라인 제거)
function subToText(raw: string): string {
  const t = raw.trim()
  // json3
  if (t.startsWith('{')) {
    try {
      const j = JSON.parse(t) as { events?: { segs?: { utf8?: string }[] }[] }
      const s = (j.events ?? []).map((e) => (e.segs ?? []).map((x) => x.utf8 ?? '').join('')).join(' ')
      return s.replace(/\s+/g, ' ').trim()
    } catch {
      /* fallthrough */
    }
  }
  // vtt/srt
  const lines: string[] = []
  for (let ln of t.split(/\r?\n/)) {
    ln = ln.trim()
    if (!ln || ln === 'WEBVTT' || ln.includes('-->') || /^\d+$/.test(ln)) continue
    if (/^(Kind|Language|NOTE|STYLE|Region):/.test(ln)) continue
    lines.push(ln.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
  }
  const seen = new Set<string>()
  const out: string[] = []
  for (const l of lines) {
    if (l && !seen.has(l)) {
      seen.add(l)
      out.push(l)
    }
  }
  return out.join(' ').replace(/\s+/g, ' ').trim()
}

// 1) yt-dlp 로 자막 파일 다운로드 → 파싱 (쿠키 있으면 봇차단 우회)
async function viaYtdlp(vid: string): Promise<string | null> {
  let dir = ''
  try {
    dir = await mkdtemp(join(tmpdir(), 'ytsub-'))
    const args = [
      '--no-update', '--skip-download', '--no-warnings',
      '--write-auto-subs', '--write-subs',
      '--sub-langs', 'ko,ko-orig,en,en-orig,ko-KR,en-US',
      '--sub-format', 'json3/vtt/best',
      '-o', join(dir, '%(id)s.%(ext)s'),
      `https://www.youtube.com/watch?v=${vid}`,
    ]
    if (COOKIES && existsSync(COOKIES)) args.push('--cookies', COOKIES)
    await pexec(YTDLP, args, { timeout: 60000, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, HOME: '/home/beamrock' } })
    const files = (await readdir(dir)).filter((f) => /\.(json3|vtt|srt|srv\d)$/.test(f))
    const pick = files.find((f) => /\.ko\b|\.ko-/.test(f)) ?? files.find((f) => /\.en\b|\.en-/.test(f)) ?? files[0]
    if (!pick) return null
    const txt = subToText(await readFile(join(dir, pick), 'utf8'))
    return txt.length > 30 ? txt : null
  } catch {
    return null
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

// 2) Invidious 공개 인스턴스로 자막 목록+본문 프록시
const INVIDIOUS = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://yewtu.be',
  'https://invidious.privacyredirect.com',
  'https://iv.melmac.space',
]
async function viaInvidious(vid: string): Promise<string | null> {
  for (const host of INVIDIOUS) {
    try {
      const meta = await fetch(`${host}/api/v1/captions/${vid}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      })
      if (!meta.ok) continue
      const j = (await meta.json()) as { captions?: { languageCode: string; url: string }[] }
      const caps = j.captions ?? []
      if (!caps.length) continue
      const pick = caps.find((c) => c.languageCode?.startsWith('ko')) ?? caps.find((c) => c.languageCode?.startsWith('en')) ?? caps[0]
      const body = await fetch(pick.url.startsWith('http') ? pick.url : `${host}${pick.url}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(12000),
      })
      const txt = subToText(await body.text())
      if (txt.length > 30) return txt
    } catch {
      /* try next */
    }
  }
  return null
}

// 3) 워치페이지 captionTracks 직접 (무쿠키, 데이터센터에선 대개 실패)
async function viaWatchPage(vid: string): Promise<string | null> {
  try {
    const html = await (
      await fetch(`https://www.youtube.com/watch?v=${vid}&hl=ko`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept-Language': 'ko,en' },
        signal: AbortSignal.timeout(12000),
      })
    ).text()
    const m = html.match(/"captionTracks":(\[.*?\}\])/)
    if (!m) return null
    const tracks = JSON.parse(m[1].replace(/\\u0026/g, '&')) as { baseUrl: string; languageCode: string }[]
    if (!tracks.length) return null
    const track = tracks.find((t) => t.languageCode?.startsWith('ko')) ?? tracks.find((t) => t.languageCode?.startsWith('en')) ?? tracks[0]
    const cap = await (await fetch(track.baseUrl + '&fmt=json3', { signal: AbortSignal.timeout(12000) })).text()
    const txt = subToText(cap)
    return txt.length > 30 ? txt : null
  } catch {
    return null
  }
}

// 다중 전략 순차 시도: (빠른)워치페이지 → Invidious → (신뢰)yt-dlp
export async function fetchTranscript(vid: string): Promise<string | null> {
  return (await viaWatchPage(vid)) ?? (await viaInvidious(vid)) ?? (await viaYtdlp(vid)) ?? null
}
