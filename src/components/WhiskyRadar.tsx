// 위스키 향/맛 8축 레이더 (SVG, 의존성 없음)
const AXES: [string, string][] = [
  ['cereal', '곡물'],
  ['fruity', '과일'],
  ['floral', '꽃향'],
  ['peaty', '피트'],
  ['feinty', '페인티'],
  ['sulphur', '유황'],
  ['woody', '우디'],
  ['winey', '와인'],
]
const CX = 110, CY = 122, R = 74, MAX = 4

function pt(i: number, r: number): [number, number] {
  const a = -Math.PI / 2 + i * ((2 * Math.PI) / AXES.length)
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}

export default function WhiskyRadar({
  values,
  title,
  color = '#ea580c',
}: {
  values: Record<string, number> | null | undefined
  title: string
  color?: string
}) {
  const grid = [1, 2, 3, 4].map((lv) => AXES.map((_, i) => pt(i, (R * lv) / MAX).join(',')).join(' '))
  const dataPts = AXES.map(([k], i) => pt(i, (R * Math.max(0, Math.min(MAX, values?.[k] ?? 0))) / MAX))
  const dataStr = dataPts.map((p) => p.join(',')).join(' ')
  const hasData = !!values && AXES.some(([k]) => (values[k] ?? 0) > 0)

  return (
    <svg viewBox="0 0 220 236" className="w-full max-w-[230px]">
      <text x={CX} y={12} textAnchor="middle" className="fill-neutral-600" fontSize={11} fontWeight={600}>{title}</text>
      {grid.map((g, i) => (
        <polygon key={i} points={g} fill="none" stroke="#e5e5e5" strokeWidth={0.7} />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = pt(i, R)
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#e5e5e5" strokeWidth={0.7} />
      })}
      {hasData && <polygon points={dataStr} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={1.6} />}
      {hasData && dataPts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={1.8} fill={color} />)}
      {AXES.map(([, label], i) => {
        const [x, y] = pt(i, R + 13)
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-neutral-500" fontSize={9}>
            {label}
          </text>
        )
      })}
    </svg>
  )
}
