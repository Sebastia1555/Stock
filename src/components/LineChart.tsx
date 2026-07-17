// Gráfico de líneas SVG propio (multi-serie) para el track record. Sin librerías.
export interface ChartSeries {
  label: string
  color: string // variable CSS o color
  points: { date: string; value: number }[]
  dashed?: boolean
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} k`
  return n.toLocaleString('es-ES', { maximumFractionDigits: 0 })
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

const W = 640
const H = 240
const PAD_L = 46
const PAD_R = 10
const PAD_T = 10
const PAD_B = 24

export function LineChart({ series }: { series: ChartSeries[] }) {
  const all = series.flatMap((s) => s.points.map((p) => p.value))
  if (all.length === 0) return null
  const n = Math.max(...series.map((s) => s.points.length))
  if (n < 2) return null

  let min = Math.min(...all)
  let max = Math.max(...all)
  if (max - min < 1e-9) {
    max += 1
    min -= 1
  }
  const span = max - min
  min -= span * 0.06
  max += span * 0.06

  const x = (i: number, len: number) => PAD_L + ((W - PAD_L - PAD_R) * i) / (len - 1)
  const y = (v: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - (v - min) / (max - min))

  const gridLines = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3)
  const first = series[0].points
  const firstDate = first[0]?.date
  const lastDate = first[first.length - 1]?.date

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Evolución: ${series.map((s) => s.label).join(' frente a ')}`}
      >
        {gridLines.map((v) => (
          <g key={v}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke="var(--color-hairline)" strokeWidth="1" />
            <text x={PAD_L - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10.5" fill="var(--color-ink-soft)" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatCompact(v)}
            </text>
          </g>
        ))}
        {series.map((s) => {
          const pts = s.points.map((p, i) => `${x(i, s.points.length).toFixed(1)},${y(p.value).toFixed(1)}`)
          return (
            <polyline
              key={s.label}
              points={pts.join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={s.dashed ? 1.25 : 2}
              strokeDasharray={s.dashed ? '4 4' : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )
        })}
        {firstDate && (
          <text x={PAD_L} y={H - 7} fontSize="10.5" fill="var(--color-ink-soft)">
            {formatShortDate(firstDate)}
          </text>
        )}
        {lastDate && (
          <text x={W - PAD_R} y={H - 7} textAnchor="end" fontSize="10.5" fill="var(--color-ink-soft)">
            {formatShortDate(lastDate)}
          </text>
        )}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[12px] text-[var(--color-ink-soft)]">
            <span
              aria-hidden="true"
              className="inline-block h-0.5 w-4 rounded-full"
              style={{ background: s.color, opacity: s.dashed ? 0.7 : 1 }}
            />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
