'use client'
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import WhiskyRadar from '@/components/WhiskyRadar'

const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

type Radar = Record<string, number>
type Whisky = {
  id: string; name_ko: string | null; name_en: string | null; image_url: string | null
  liquor: string | null; type: string | null; style: string | null; cask: string | null; peat: string | null; distillery: string | null; abv: number | null; description: string | null
}
const LIQUORS = ['위스키', '보드카', '진', '럼', '데킬라', '브랜디', '리큐르', '사케', '막걸리', '소주', '전통주', '와인', '맥주', '기타']
const STYLES = ['싱글몰트', '블렌디드', '블렌디드몰트', '싱글그레인', '버번', '라이', '기타']
const PEATS = ['논피트', '피트']
type Profile = {
  id: string; author: string
  nose: string | null; palate: string | null; finish: string | null
  aroma: Radar | null; flavour: Radar | null; evaluation: string | null; serving: Record<string, number> | null
  color: string | null; rating: number | null; personal_note: string | null; tasted_on: string | null
}
type Purchase = { id: string; purchase_date: string; price: number | null; shop: { name: string } | null }
type Obs = { id: string; price: number; observed_on: string | null; shop: { name: string } | null }
type WImage = { id: string; url: string; is_primary: boolean }

const COLORS = ['#fbf3d9', '#f6e5a8', '#efd479', '#e7bf50', '#dda838', '#cf8f27', '#bd781c', '#a56316', '#894f11', '#6b3d0d']
const SERVINGS: [string, string, string][] = [['neat', '니트', '🥃'], ['rocks', '온더락', '🧊'], ['highball', '하이볼', '🥤']]
const SCORES = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
const won = (n: number | null | undefined) => (n == null ? '-' : `${n.toLocaleString()}원`)
// 평점 = 니트/온더락/하이볼(입력된 것)의 평균. 기존 저장 rating은 무시하고 자동 산출.
function servingAvg(serving: Record<string, number> | null | undefined): number {
  const vals = SERVINGS.map(([k]) => serving?.[k]).filter((v): v is number => typeof v === 'number' && v > 0)
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0
}

export default function WhiskyDetail() {
  const { id } = useParams<{ id: string }>()
  const [w, setW] = useState<Whisky | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeId, setActiveId] = useState('')
  const [p, setP] = useState<Profile | null>(null)
  const [buys, setBuys] = useState<Purchase[]>([])
  const [obs, setObs] = useState<Obs[]>([])
  const [images, setImages] = useState<WImage[]>([])
  const [abvStr, setAbvStr] = useState('')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [regen, setRegen] = useState(false)
  const [pForm, setPForm] = useState({ date: '', shop: '', price: '' })
  const [oForm, setOForm] = useState({ shop: '', price: '', volume: '', url: '' })
  const [adding, setAdding] = useState(false)
  const activeIdRef = useRef('')
  useEffect(() => { activeIdRef.current = activeId }, [activeId])

  const load = useCallback(async (preferAuthor?: string) => {
    const d = await (await fetch(`${BP}/api/whisky/${id}`)).json()
    setW(d.whisky); setBuys(d.purchases ?? []); setObs(d.observations ?? []); setImages(d.images ?? [])
    setAbvStr(d.whisky?.abv != null ? String(d.whisky.abv) : '')
    const profs: Profile[] = d.profiles ?? []
    setProfiles(profs)
    const act = (preferAuthor && profs.find((x) => x.author === preferAuthor)) || profs.find((x) => x.id === activeIdRef.current) || profs[0] || null
    setActiveId(act?.id ?? ''); setP(act ? { ...act } : null)
    setDirty(false)
  }, [id])
  useEffect(() => { void load() }, [load])

  // 구매/시세/이미지(객관) 변경 후 — 활성 프로필 편집상태는 보존
  const reloadObjective = async () => {
    const d = await (await fetch(`${BP}/api/whisky/${id}`)).json()
    setBuys(d.purchases ?? []); setObs(d.observations ?? []); setImages(d.images ?? [])
    setW((prev) => (prev ? { ...prev, image_url: d.whisky?.image_url ?? null } : prev))
  }

  const updateW = (f: Partial<Whisky>) => { setW((prev) => (prev ? { ...prev, ...f } : prev)); setDirty(true) }
  const updateP = (f: Partial<Profile>) => { setP((prev) => (prev ? { ...prev, ...f } : prev)); setDirty(true) }
  const setServing = (key: string, val: number) => updateP({ serving: { ...(p?.serving ?? {}), [key]: val } })

  const commit = async () => {
    if (!w) return
    setSaving(true)
    try {
      await fetch(`${BP}/api/whisky/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        name_ko: w.name_ko, name_en: w.name_en, liquor: w.liquor, type: w.type, style: w.style, cask: w.cask, peat: w.peat, distillery: w.distillery,
        abv: abvStr.trim() ? Number(abvStr.replace(/[^0-9.]/g, '')) : null, description: w.description,
      }) })
      if (p) {
        await fetch(`${BP}/api/whisky/${id}/profile`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          profileId: p.id, nose: p.nose, palate: p.palate, finish: p.finish, aroma: p.aroma, flavour: p.flavour,
          evaluation: p.evaluation, serving: p.serving, color: p.color, personal_note: p.personal_note, tasted_on: p.tasted_on,
        }) })
        setProfiles((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...p } : x)))
      }
      setDirty(false)
    } finally { setSaving(false) }
  }

  const switchTab = (prof: Profile) => {
    if (dirty && !confirm('저장하지 않은 변경사항이 있습니다. 저장 없이 이동할까요?')) return
    setActiveId(prof.id); setP({ ...prof }); setDirty(false)
  }
  const addAuthor = async () => {
    const name = prompt('작성자 이름')
    if (!name?.trim()) return
    const res = await fetch(`${BP}/api/whisky/${id}/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author: name.trim() }) })
    const d = await res.json()
    if (!res.ok) { alert(d.error ?? '추가 실패'); return }
    await load(name.trim())
  }
  const delAuthor = async () => {
    if (!p || !confirm(`작성자 '${p.author}' 프로필을 삭제할까요?`)) return
    const res = await fetch(`${BP}/api/whisky/${id}/profile`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: p.id }) })
    const d = await res.json()
    if (!res.ok) { alert(d.error); return }
    activeIdRef.current = ''; await load()
  }
  const regenerate = async () => {
    if (!p || !confirm('AI로 이 작성자의 향·맛·피니시·레이더·평가 + 위스키 정보를 다시 생성할까요?')) return
    setRegen(true)
    try {
      await fetch(`${BP}/api/whisky/${id}/profile`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: p.id, regenerate: true }) })
      await load(p.author)
    } finally { setRegen(false) }
  }

  const addPurchase = async () => {
    if (!pForm.date) { alert('구매일자를 입력하세요'); return }
    setAdding(true)
    try { await fetch(`${BP}/api/purchase`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ whisky_id: id, purchase_date: pForm.date, shop_name: pForm.shop, price: pForm.price }) }); setPForm({ date: '', shop: '', price: '' }); await reloadObjective() } finally { setAdding(false) }
  }
  const delPurchase = async (pid: string) => { await fetch(`${BP}/api/purchase`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pid }) }); await reloadObjective() }
  const addObs = async () => {
    if (!oForm.price) { alert('가격을 입력하세요'); return }
    setAdding(true)
    try { await fetch(`${BP}/api/price-observation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ whisky_id: id, shop_name: oForm.shop, price: oForm.price, volume_ml: oForm.volume, url: oForm.url }) }); setOForm({ shop: '', price: '', volume: '', url: '' }); await reloadObjective() } finally { setAdding(false) }
  }
  const delObs = async (oid: string) => { await fetch(`${BP}/api/price-observation`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: oid }) }); await reloadObjective() }
  const uploadImg = async (file: File) => { const fd = new FormData(); fd.append('image', file); setAdding(true); try { await fetch(`${BP}/api/whisky/${id}/image`, { method: 'POST', body: fd }); await reloadObjective() } finally { setAdding(false) } }
  const setPrimaryImg = async (imageId: string) => { await fetch(`${BP}/api/whisky/${id}/image`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageId }) }); await reloadObjective() }
  const delImg = async (imageId: string) => { await fetch(`${BP}/api/whisky/${id}/image`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageId }) }); await reloadObjective() }

  if (!w) return <div className="text-sm text-neutral-400">불러오는 중...</div>

  const priceRecs: { price: number; when: string | null; shop: string | null }[] = [
    ...obs.map((o) => ({ price: o.price, when: o.observed_on, shop: o.shop?.name ?? null })),
    ...buys.filter((b) => b.price != null).map((b) => ({ price: b.price as number, when: b.purchase_date, shop: b.shop?.name ?? null })),
  ]
  const minRec = priceRecs.length ? priceRecs.reduce((a, b) => (b.price < a.price ? b : a)) : null
  const maxRec = priceRecs.length ? priceRecs.reduce((a, b) => (b.price > a.price ? b : a)) : null
  const avg = priceRecs.length ? Math.round(priceRecs.reduce((s, r) => s + r.price, 0) / priceRecs.length) : null
  const latest = buys[0]
  const pctx = (r: { when: string | null; shop: string | null } | null) => (r ? [r.when, r.shop].filter(Boolean).join(', ') : '')
  const primaryImg = images.find((i) => i.is_primary) ?? images[0] ?? null
  const lbl = 'text-[11px] font-medium text-amber-700/70 shrink-0'
  const box = 'rounded-lg border border-amber-100 bg-white'

  return (
    <div className="mx-auto max-w-3xl pb-24">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b-2 border-amber-800/20 pb-3">
        <div className="flex items-center gap-3">
          <span className="rounded bg-neutral-800 px-2.5 py-1 text-sm font-bold text-white">🥃</span>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900" style={{ fontFamily: 'ui-serif, serif' }}>테이스팅 노트</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={regenerate} disabled={regen} className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700 hover:bg-amber-100 disabled:opacity-50">{regen ? '생성 중…' : '🔄 프로필 재생성'}</button>
          <Link href="/whisky" className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50">← 목록</Link>
        </div>
      </div>

      {/* 작성자 탭 */}
      <div className="mt-3 flex flex-wrap items-center gap-1 border-b border-amber-100">
        {profiles.map((prof) => (
          <button key={prof.id} onClick={() => switchTab(prof)}
            className={`-mb-px rounded-t-md border-b-2 px-3 py-1.5 text-sm ${prof.id === activeId ? 'border-amber-600 font-semibold text-amber-700' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>
            {prof.author}
          </button>
        ))}
        <button onClick={addAuthor} className="px-2 py-1.5 text-xs text-amber-600 hover:underline">＋ 작성자 추가</button>
        {profiles.length > 1 && <button onClick={delAuthor} className="ml-auto px-2 py-1.5 text-[11px] text-neutral-300 hover:text-red-500">이 작성자 삭제</button>}
      </div>

      {/* 작성자 개인 헤더: 시음일·평점 */}
      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5"><span className={lbl}>시음일</span>
          <input type="date" value={p?.tasted_on ?? ''} onChange={(e) => updateP({ tasted_on: e.target.value })} className="rounded border border-neutral-200 px-2 py-0.5 text-xs" /></label>
        <div className="flex items-center gap-1.5"><span className={lbl}>평점</span>
          <IconRating score={servingAvg(p?.serving)} icon="🛢️" />
          <span className="text-[11px] text-neutral-400">시음유형 평균</span>
        </div>
        <span className="text-[11px] text-neutral-400">by {p?.author}</span>
      </div>

      {/* 정보 (공유) */}
      <Section title="정보 (공통)">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_1fr]">
          <div className="space-y-2">
            {primaryImg ? (
              <button onClick={() => setLightbox(primaryImg.url)} className="block w-full" title="클릭하면 전체화면">
                <img src={primaryImg.url} alt="" className="max-h-56 w-full rounded-lg border border-amber-100 bg-neutral-50 object-contain" />
              </button>
            ) : <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-amber-200 text-3xl text-amber-200">🥃</div>}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((im) => (
                  <div key={im.id} className="flex flex-col items-center">
                    <button onClick={() => setLightbox(im.url)}><img src={im.url} alt="" className={`h-12 w-12 rounded object-cover ${im.is_primary ? 'ring-2 ring-amber-500' : 'ring-1 ring-neutral-200'}`} /></button>
                    <div className="mt-0.5 flex gap-1 text-[9px]">
                      {im.is_primary ? <span className="text-amber-600">대표</span> : <button onClick={() => setPrimaryImg(im.id)} className="text-amber-600 hover:underline">대표설정</button>}
                      <button onClick={() => delImg(im.id)} className="text-neutral-300 hover:text-red-500">삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <label className="block cursor-pointer rounded-md border border-dashed border-amber-200 px-2 py-1.5 text-center text-[11px] text-amber-600 hover:bg-amber-50">
              {adding ? '업로드 중…' : '📷 이미지 추가'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImg(f); e.target.value = '' }} />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
            <Row label="주종">
              <select value={w.liquor ?? ''} onChange={(e) => updateW({ liquor: e.target.value || null })}
                className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-800 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400">
                <option value="">(미지정)</option>
                {LIQUORS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Row>
            <Row label="종류"><Edit value={w.type} onChange={(v) => updateW({ type: v })} ph="싱글몰트 스카치" /></Row>
            <Row label="구분">
              <select value={w.style ?? ''} onChange={(e) => updateW({ style: e.target.value || null })}
                className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-800 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400">
                <option value="">(미지정)</option>
                {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Row>
            <Row label="캐스크"><Edit value={w.cask} onChange={(v) => updateW({ cask: v })} ph="버번캐스크·쉐리캐스크 등" /></Row>
            <Row label="피트">
              <select value={w.peat ?? ''} onChange={(e) => updateW({ peat: e.target.value || null })}
                className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-800 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400">
                <option value="">(미지정)</option>
                {PEATS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Row>
            <Row label="증류소"><Edit value={w.distillery} onChange={(v) => updateW({ distillery: v })} ph="증류소·지역" /></Row>
            <Row label="이름">
              <div className="flex flex-col gap-1">
                <Edit value={w.name_ko} onChange={(v) => updateW({ name_ko: v })} ph="한글명 (예: 듀어스 12년)" />
                <Edit value={w.name_en} onChange={(v) => updateW({ name_en: v })} ph="영문명 (예: Dewar's 12)" />
              </div>
            </Row>
            <Row label="도수"><span className="inline-flex items-baseline gap-0.5"><input value={abvStr} onChange={(e) => { setAbvStr(e.target.value); setDirty(true) }} placeholder="43" className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-800 placeholder:text-neutral-300 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400" />{abvStr && <span className="text-sm text-neutral-500">%</span>}</span></Row>
            <Row label="가격">{latest ? <span className="text-sm text-neutral-800">{won(latest.price)}</span> : <span className="text-sm text-neutral-400">{avg != null ? `시세 평균 ${won(avg)}` : '-'}</span>}</Row>
            <Row label="상점"><span className="text-sm text-neutral-800">{latest?.shop?.name ?? '-'}</span></Row>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className={`${box} p-2`}><div className="text-amber-700/60">최저가</div><div className="mt-0.5 font-semibold text-neutral-800">{won(minRec?.price)}</div>{minRec && <div className="text-[10px] text-neutral-400">{pctx(minRec)}</div>}</div>
          <div className={`${box} p-2`}><div className="text-amber-700/60">평균가</div><div className="mt-0.5 font-semibold text-neutral-800">{won(avg)}</div></div>
          <div className={`${box} p-2`}><div className="text-amber-700/60">최고가</div><div className="mt-0.5 font-semibold text-neutral-800">{won(maxRec?.price)}</div>{maxRec && <div className="text-[10px] text-neutral-400">{pctx(maxRec)}</div>}</div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-medium text-amber-700/70">＋ 시세</span>
          <input value={oForm.shop} onChange={(e) => setOForm({ ...oForm, shop: e.target.value })} placeholder="상점" className="w-24 rounded border border-neutral-200 px-2 py-1" />
          <input value={oForm.price} onChange={(e) => setOForm({ ...oForm, price: e.target.value })} placeholder="가격" type="number" className="w-24 rounded border border-neutral-200 px-2 py-1" />
          <input value={oForm.volume} onChange={(e) => setOForm({ ...oForm, volume: e.target.value })} placeholder="용량ml" type="number" className="w-20 rounded border border-neutral-200 px-2 py-1" />
          <input value={oForm.url} onChange={(e) => setOForm({ ...oForm, url: e.target.value })} placeholder="링크(선택)" className="w-28 rounded border border-neutral-200 px-2 py-1" />
          <button onClick={addObs} disabled={adding} className="rounded bg-neutral-700 px-2.5 py-1 text-white hover:bg-neutral-800 disabled:opacity-50">추가</button>
        </div>
        {obs.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {obs.map((o) => <span key={o.id} className="inline-flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600">{o.shop?.name ?? ''} {won(o.price)}{o.observed_on ? ` (${o.observed_on})` : ''}<button onClick={() => delObs(o.id)} className="text-neutral-300 hover:text-red-500">✕</button></span>)}
          </div>
        )}
        <div className="mt-3">
          <div className="mb-1 flex items-center gap-2"><span className="text-xs font-semibold text-amber-800">구매 기록</span><span className="text-[11px] text-neutral-400">{buys.length}회</span></div>
          {buys.length > 0 && <ul className="mb-1 space-y-0.5 text-xs text-neutral-600">{buys.map((pu) => <li key={pu.id} className="flex items-center gap-1.5"><span>· {pu.purchase_date} · {pu.shop?.name ?? '상점미상'} · {won(pu.price)}</span><button onClick={() => delPurchase(pu.id)} className="text-neutral-300 hover:text-red-500">✕</button></li>)}</ul>}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <input type="date" value={pForm.date} onChange={(e) => setPForm({ ...pForm, date: e.target.value })} className="rounded border border-neutral-200 px-2 py-1" />
            <input value={pForm.shop} onChange={(e) => setPForm({ ...pForm, shop: e.target.value })} placeholder="상점" className="w-24 rounded border border-neutral-200 px-2 py-1" />
            <input value={pForm.price} onChange={(e) => setPForm({ ...pForm, price: e.target.value })} placeholder="가격" type="number" className="w-24 rounded border border-neutral-200 px-2 py-1" />
            <button onClick={addPurchase} disabled={adding} className="rounded bg-amber-600 px-2.5 py-1 text-white hover:bg-amber-700 disabled:opacity-50">구매 추가</button>
          </div>
        </div>
      </Section>

      {/* 감각 (작성자별) */}
      <Section title={`감각 (${p?.author ?? ''})`}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className={lbl}>색</span>
            <div className="flex gap-1">{COLORS.map((c) => <button key={c} onClick={() => updateP({ color: p?.color === c ? null : c })} className={`h-6 w-6 rounded ${p?.color === c ? 'ring-2 ring-neutral-800 ring-offset-1' : 'ring-1 ring-neutral-200'}`} style={{ background: c }} />)}</div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className={`${box} p-3`}><div className={`${lbl} mb-1`}>향 (Nose)</div><Edit value={p?.nose ?? null} onChange={(v) => updateP({ nose: v })} ph="향 노트" area /></div>
            <div className={`${box} p-3`}><div className={`${lbl} mb-1`}>맛 (Palate)</div><Edit value={p?.palate ?? null} onChange={(v) => updateP({ palate: v })} ph="맛 노트" area /></div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className={`${box} p-2`}><WhiskyRadar values={p?.aroma} title="향 (Aroma)" color="#ea580c" /><RadarSliders values={p?.aroma ?? null} onChange={(v) => updateP({ aroma: v })} color="#ea580c" /></div>
            <div className={`${box} p-2`}><WhiskyRadar values={p?.flavour} title="맛 (Flavour)" color="#b45309" /><RadarSliders values={p?.flavour ?? null} onChange={(v) => updateP({ flavour: v })} color="#b45309" /></div>
          </div>
          <div className={`${box} p-3`}><div className={`${lbl} mb-1`}>피니시 (Finish)</div><Edit value={p?.finish ?? null} onChange={(v) => updateP({ finish: v })} ph="여운" area /></div>
        </div>
      </Section>

      {/* 시음유형 (작성자별) */}
      <Section title="시음유형">
        <div className={`${box} space-y-2 p-3`}>
          {SERVINGS.map(([key, label, icon]) => {
            const sc = p?.serving?.[key] ?? 0
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-medium text-neutral-700">{label}</span>
                <IconRating score={sc} icon={icon} />
                <select value={sc} onChange={(e) => setServing(key, Number(e.target.value))} className="ml-auto rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 focus:outline-none focus:ring-1 focus:ring-amber-500">
                  {SCORES.map((s) => <option key={s} value={s}>{s.toFixed(1)}점</option>)}
                </select>
              </div>
            )
          })}
        </div>
      </Section>

      {/* 종합 (작성자별) */}
      <Section title="종합">
        <div className={`${box} p-3`}>
          <Edit value={p?.evaluation ?? null} onChange={(v) => updateP({ evaluation: v })} ph="대체적 평가·총평" area rows={6} />
          {w.description && <p className="mt-2 border-t border-amber-50 pt-2 text-xs text-neutral-400">참고: {w.description}</p>}
        </div>
      </Section>

      {/* 노트 (작성자별) */}
      <Section title="노트">
        <div className={`${box} p-3`}><Edit value={p?.personal_note ?? null} onChange={(v) => updateP({ personal_note: v })} ph="자유 메모 (분위기·함께한 사람·상황 등)" area rows={4} /></div>
      </Section>

      {/* 이미지 전체화면 */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-h-full max-w-full object-contain" />
          <button onClick={() => setLightbox(null)} className="fixed right-4 top-4 text-3xl leading-none text-white">✕</button>
        </div>
      )}

      {/* 저장 바 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-200 bg-white/95 px-4 py-2.5 backdrop-blur md:left-52">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="mr-auto text-[11px] text-neutral-400">✏️ 각 항목을 눌러 바로 수정 → 저장</span>
          {dirty && <span className="text-xs font-medium text-amber-600">저장되지 않은 변경사항</span>}
          <button onClick={commit} disabled={saving || !dirty} className="rounded-lg bg-amber-600 px-6 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40">{saving ? '저장 중…' : '저장'}</button>
        </div>
      </div>
    </div>
  )
}

const RAXES: [string, string][] = [['cereal', '곡물'], ['fruity', '과일'], ['floral', '꽃향'], ['peaty', '피트'], ['feinty', '페인티'], ['sulphur', '유황'], ['woody', '우디'], ['winey', '와인']]
function RadarSliders({ values, onChange, color }: { values: Radar | null; onChange: (v: Radar) => void; color: string }) {
  const v = values ?? {}
  const setAxis = (k: string, n: number) => onChange({ ...(RAXES.reduce((a, [key]) => ({ ...a, [key]: v[key] ?? 0 }), {} as Radar)), [k]: n })
  return (
    <div className="mt-1 space-y-0.5 px-1">
      {RAXES.map(([k, lab]) => (
        <label key={k} className="flex items-center gap-2 text-[11px]">
          <span className="w-8 shrink-0 text-neutral-500">{lab}</span>
          <input type="range" min={0} max={4} step={1} value={v[k] ?? 0} onChange={(e) => setAxis(k, Number(e.target.value))} className="h-1 flex-1 cursor-pointer" style={{ accentColor: color }} />
          <span className="w-3 text-right text-neutral-400">{v[k] ?? 0}</span>
        </label>
      ))}
    </div>
  )
}
function IconRating({ score, icon }: { score: number; icon: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = score >= i ? 'full' : score >= i - 0.5 ? 'half' : 'empty'
        return <span key={i} className="text-base leading-none" style={{ opacity: fill === 'full' ? 1 : fill === 'half' ? 0.45 : 0.15, filter: fill === 'empty' ? 'grayscale(1)' : 'none' }}>{icon}</span>
      })}
      <span className="ml-1.5 text-xs font-medium text-amber-700">{(score ?? 0).toFixed(1)}</span>
    </span>
  )
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<section className="mt-5"><h2 className="mb-2 text-sm font-bold text-amber-800">〉 {title}</h2>{children}</section>)
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div className="flex items-baseline gap-2 border-b border-amber-50 pb-1.5"><span className="w-12 shrink-0 text-[11px] font-medium text-amber-700/70">{label}</span><div className="min-w-0 flex-1">{children}</div></div>)
}
function Edit({ value, onChange, ph, area, rows = 2 }: { value: string | null; onChange: (v: string) => void; ph?: string; area?: boolean; rows?: number }) {
  if (area) return <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={ph} rows={rows} className="w-full resize-y rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-800 placeholder:text-neutral-300 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400" />
  return <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={ph} className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-800 placeholder:text-neutral-300 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400" />
}
