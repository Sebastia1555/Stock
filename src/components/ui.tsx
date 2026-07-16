// Componentes de UI compartidos (lenguaje visual Apple).
import type { ReactNode } from 'react'
import type { Conviction } from '../types.ts'

export function Card({ children, hero = false, className = '' }: { children: ReactNode; hero?: boolean; className?: string }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] ${hero ? 'shadow-[var(--shadow-product)]' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

const convictionStyle: Record<Conviction, string> = {
  alta: 'bg-[var(--color-gain)]/12 text-[var(--color-gain)]',
  media: 'bg-[var(--color-warn)]/12 text-[var(--color-warn)]',
  baja: 'bg-[var(--color-ink-soft)]/12 text-[var(--color-ink-soft)]',
}

export function ConvictionBadge({ conviction }: { conviction: Conviction }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${convictionStyle[conviction]}`}>
      Convicción {conviction}
    </span>
  )
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'gain' | 'loss' | 'accent' }) {
  const tones = {
    neutral: 'bg-[var(--color-parchment)] text-[var(--color-ink-soft)]',
    gain: 'bg-[var(--color-gain)]/12 text-[var(--color-gain)]',
    loss: 'bg-[var(--color-loss)]/12 text-[var(--color-loss)]',
    accent: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-medium ${tones[tone]}`}>{children}</span>
}

/** Barra de puntuación 0-100 con etiqueta. */
export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[13px] text-[var(--color-ink-soft)]">{label}</span>
        <span className="num text-[13px] font-semibold">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-parchment)]">
        <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'gain' | 'loss' | 'warn' }) {
  const color = tone === 'gain' ? 'text-[var(--color-gain)]' : tone === 'loss' ? 'text-[var(--color-loss)]' : tone === 'warn' ? 'text-[var(--color-warn)]' : ''
  return (
    <div>
      <div className="text-[13px] text-[var(--color-ink-soft)]">{label}</div>
      <div className={`num text-[22px] font-semibold ${color}`}>{value}</div>
    </div>
  )
}
