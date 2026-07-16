// Mini-gráfico SVG propio (sin librerías de charting).
import type { PricePoint } from '../types.ts'

export function Sparkline({ data, width = 220, height = 56 }: { data: PricePoint[]; width?: number; height?: number }) {
  if (data.length < 2) return null
  const closes = data.map((d) => d.close)
  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const range = max - min || 1
  const stepX = width / (closes.length - 1)
  const points = closes.map((c, i) => {
    const x = i * stepX
    const y = height - ((c - min) / range) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const up = closes[closes.length - 1] >= closes[0]
  const stroke = up ? 'var(--color-gain)' : 'var(--color-loss)'
  const areaPath = `M0,${height} L${points.join(' L')} L${width},${height} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolución del precio a 1 año" className="overflow-visible">
      <path d={areaPath} fill={stroke} fillOpacity={0.08} />
      <polyline points={points.join(' ')} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
