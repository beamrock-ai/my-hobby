import Link from 'next/link'

// 주의: next/link 는 basePath(/my-hobby)를 자동으로 붙인다. href에 직접 붙이지 말 것.
const CARDS = [
  { icon: '🍶', name: '주류 노트', desc: '위스키·보드카·리큐르 등 관리', href: '/whisky', ready: true },
  { icon: '🏆', name: '순위', desc: '평점·시음유형별 랭킹', href: '/ranking', ready: true },
  { icon: '🍷', name: '액세서리', desc: '잔·디캔터·바도구 등', href: '/accessory', ready: true },
  { icon: '📖', name: '위스키 용어사전', desc: '용어 검색·색인', href: '/glossary', ready: true },
  { icon: '🎬', name: '영화', desc: '준비중', href: '', ready: false },
  { icon: '🎮', name: '게임', desc: '준비중', href: '', ready: false },
]

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-neutral-900">취미</h1>
      <p className="mt-1 text-sm text-neutral-500">취미 기록 · 관리 대시보드</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CARDS.map((c) =>
          c.ready ? (
            <Link
              key={c.name}
              href={c.href}
              className="rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-amber-300 hover:shadow-sm"
            >
              <div className="text-2xl">{c.icon}</div>
              <div className="mt-2 text-sm font-medium text-neutral-900">{c.name}</div>
              <div className="mt-0.5 text-xs text-neutral-500">{c.desc}</div>
            </Link>
          ) : (
            <div key={c.name} className="rounded-xl border border-neutral-200 bg-white p-5 opacity-60">
              <div className="text-2xl grayscale">{c.icon}</div>
              <div className="mt-2 text-sm font-medium text-neutral-900">{c.name}</div>
              <div className="mt-0.5 text-xs text-neutral-400">{c.desc}</div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
