'use client'
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from 'react'

const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const CATEGORIES = ['글라스', '디캔터', '바도구', '보관·제빙', '기타']
const STATUSES = ['보유', '구매희망']
const won = (n: number | null | undefined) => (n == null ? '' : `${n.toLocaleString()}원`)

type Accessory = {
  id: string; name: string; category: string | null; brand: string | null; status: string | null
  price: number | null; shop: string | null; description: string | null; memo: string | null; image_url: string | null
}

export default function AccessoryPage() {
  const [data, setData] = useState<Accessory[] | null>(null)
  const [name, setName] = useState('')
  const [cat, setCat] = useState('')
  const [status, setStatus] = useState('보유')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState('')
  const [shop, setShop] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [edit, setEdit] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  // 필터
  const [q, setQ] = useState('')
  const [fCat, setFCat] = useState('')
  const [fStatus, setFStatus] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`${BP}/api/accessory`)
    setData((await res.json()).accessories ?? [])
  }, [])
  useEffect(() => { void load() }, [load])

  const createAcc = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('name', name.trim())
      if (cat) fd.append('category', cat)
      if (status) fd.append('status', status)
      if (brand.trim()) fd.append('brand', brand.trim())
      if (price.trim()) fd.append('price', price.trim())
      if (shop.trim()) fd.append('shop', shop.trim())
      if (file) fd.append('image', file)
      const res = await fetch(`${BP}/api/accessory`, { method: 'POST', body: fd })
      if (!res.ok) alert((await res.json()).error ?? '오류')
      else { setName(''); setCat(''); setStatus('보유'); setBrand(''); setPrice(''); setShop(''); setFile(null); await load() }
    } finally { setBusy(false) }
  }

  const del = async (id: string, nm: string) => {
    if (!confirm(`'${nm}' 삭제?`)) return
    await fetch(`${BP}/api/accessory`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await load()
  }

  if (!data) return <div className="text-sm text-neutral-400">불러오는 중...</div>

  const catList = CATEGORIES.filter((c) => data.some((a) => a.category === c))
  const filtered = data.filter((a) => {
    if (q.trim() && !`${a.name} ${a.brand ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())) return false
    if (fCat && a.category !== fCat) return false
    if (fStatus && (a.status ?? '보유') !== fStatus) return false
    return true
  })

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-neutral-900">🍷 액세서리</h1>
      <p className="mt-1 text-sm text-neutral-500">잔·디캔터·바도구 등 주류 관련 물품 (분류·설명은 AI 자동 보완)</p>

      {/* 등록 */}
      <div className="mt-5 space-y-2">
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void createAcc() }}
            placeholder="품목명 등록 (예: 글렌캐런 위스키잔, 리델 와인잔, 기네스 나이트로 서지)"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <button onClick={createAcc} disabled={busy || !name.trim()} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">등록</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={cat} onChange={(e) => setCat(e.target.value)} title="분류(미선택 시 AI 자동)" className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs text-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-500">
            <option value="">분류: AI 자동</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs text-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-500">
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="브랜드(선택)" className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-xs" />
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="가격(선택)" type="number" className="w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-xs" />
          <input value={shop} onChange={(e) => setShop(e.target.value)} placeholder="구매처(선택)" className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-xs" />
          <label className="cursor-pointer rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50">
            📷 사진 (선택)
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {file && <span className="flex items-center gap-1.5 text-xs text-neutral-500"><img src={URL.createObjectURL(file)} alt="" className="h-8 w-8 rounded object-cover border border-neutral-200" />{file.name}<button onClick={() => setFile(null)} className="text-neutral-300 hover:text-red-500">✕</button></span>}
        </div>
      </div>

      {/* 필터 */}
      {data.length > 0 && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 품목명 검색" className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
            <select value={fCat} onChange={(e) => setFCat(e.target.value)} className="rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-500">
              <option value="">분류: 전체</option>
              {catList.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-500">
              <option value="">상태: 전체</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {(q || fCat || fStatus) && <button onClick={() => { setQ(''); setFCat(''); setFStatus('') }} className="rounded-md border border-neutral-300 bg-white px-2.5 py-2 text-xs text-neutral-500 hover:bg-neutral-100">초기화</button>}
          </div>
          <div className="mt-2 text-[11px] text-neutral-500">{filtered.length} / {data.length}개 표시</div>
        </div>
      )}

      {/* 목록 */}
      <div className="mt-4 space-y-3">
        {data.length === 0 && <p className="text-sm text-neutral-400">아직 등록된 액세서리가 없습니다.</p>}
        {data.length > 0 && filtered.length === 0 && <p className="text-sm text-neutral-400">조건에 맞는 항목이 없습니다.</p>}
        {filtered.map((a) => (
          <div key={a.id} className="rounded-xl border border-neutral-200 bg-white p-4">
            {edit === a.id
              ? <EditCard a={a} onClose={() => setEdit(null)} onSaved={load} />
              : (
                <div className="flex gap-3">
                  {a.image_url
                    ? <img src={a.image_url} alt={a.name} onClick={() => setLightbox(a.image_url)} className="h-20 w-20 shrink-0 cursor-zoom-in rounded-md border border-neutral-200 object-cover" />
                    : <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-2xl">🍷</span>}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-neutral-900">{a.name}</span>
                      {a.category && <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-600">{a.category}</span>}
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${(a.status ?? '보유') === '보유' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{a.status ?? '보유'}</span>
                      {a.brand && <span className="text-xs text-neutral-400">{a.brand}</span>}
                    </div>
                    {(a.price != null || a.shop) && <div className="mt-1 text-xs text-neutral-500">{[won(a.price), a.shop].filter(Boolean).join(' · ')}</div>}
                    {a.description && <p className="mt-1.5 text-sm text-neutral-700">{a.description}</p>}
                    {a.memo && <p className="mt-1 text-xs text-neutral-500">메모: {a.memo}</p>}
                    <div className="mt-2 flex gap-3 text-xs">
                      <button onClick={() => setEdit(a.id)} className="text-amber-600 hover:underline">수정</button>
                      <button onClick={() => del(a.id, a.name)} className="text-neutral-300 hover:text-red-500">삭제</button>
                    </div>
                  </div>
                </div>
              )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-h-full max-w-full object-contain" />
          <button onClick={() => setLightbox(null)} className="fixed right-4 top-4 text-3xl leading-none text-white">✕</button>
        </div>
      )}
    </div>
  )
}

function EditCard({ a, onClose, onSaved }: { a: Accessory; onClose: () => void; onSaved: () => Promise<void> }) {
  const [f, setF] = useState<Accessory>(a)
  const [saving, setSaving] = useState(false)
  const set = (k: keyof Accessory) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }))
  const inp = 'w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500'

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${BP}/api/accessory/${a.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.name, category: f.category, brand: f.brand, status: f.status, price: f.price, shop: f.shop, description: f.description, memo: f.memo }),
      })
      if (!res.ok) { alert((await res.json()).error ?? '오류'); return }
      onClose(); await onSaved()
    } finally { setSaving(false) }
  }
  const replaceImg = async (file: File) => {
    const fd = new FormData(); fd.append('image', file)
    await fetch(`${BP}/api/accessory/${a.id}`, { method: 'PATCH', body: fd })
    onClose(); await onSaved()
  }

  return (
    <div className="space-y-2">
      <input value={f.name} onChange={set('name')} placeholder="품목명" className={inp} />
      <div className="flex flex-wrap gap-2">
        <select value={f.category ?? ''} onChange={set('category')} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">분류 미지정</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={f.status ?? '보유'} onChange={set('status')} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input value={f.brand ?? ''} onChange={set('brand')} placeholder="브랜드" className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        <input value={f.price ?? ''} onChange={set('price')} placeholder="가격" type="number" className="w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        <input value={f.shop ?? ''} onChange={set('shop')} placeholder="구매처" className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
      </div>
      <textarea value={f.description ?? ''} onChange={set('description')} placeholder="설명" rows={2} className={`${inp} resize-y`} />
      <textarea value={f.memo ?? ''} onChange={set('memo')} placeholder="메모" rows={2} className={`${inp} resize-y`} />
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="rounded-lg bg-amber-600 px-5 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">{saving ? '저장 중…' : '저장'}</button>
        <button onClick={onClose} className="text-xs text-neutral-400 hover:text-neutral-600">취소</button>
        <label className="ml-auto cursor-pointer rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50">
          📷 사진 교체
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void replaceImg(file); e.target.value = '' }} />
        </label>
      </div>
    </div>
  )
}
