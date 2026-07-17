// Cabecera, pie y aviso legal.
import type { ReactNode } from 'react'
import { Menu } from './Menu.tsx'

export function Header({ date, onDateChange }: { date: string; onDateChange: (d: string) => void }) {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--color-hairline)] bg-[var(--color-canvas)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--color-accent)] text-[15px] font-bold text-white">S</span>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold">Stock&amp;Sebas</div>
            <div className="text-[12px] text-[var(--color-ink-soft)]">Value diario · S&P 500</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-[13px] text-[var(--color-ink-soft)]">
            <span className="hidden sm:inline">Fecha</span>
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="num rounded-lg border border-[var(--color-hairline)] bg-[var(--color-parchment)] px-2.5 py-1.5 text-[13px] text-[var(--color-ink)]"
            />
          </label>
          <Menu />
        </div>
      </div>
    </header>
  )
}

export function LegalNotice() {
  return (
    <p className="mt-10 text-[12px] leading-relaxed text-[var(--color-ink-soft)]">
      <strong className="font-semibold text-[var(--color-ink)]">Aviso legal.</strong> Es una herramienta de análisis y
      registro personal; no constituye asesoramiento financiero. Las decisiones de inversión y sus riesgos son
      responsabilidad exclusiva del usuario. Datos de mercado simulados con fines de demostración.
    </p>
  )
}

export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-[20px] font-semibold">{title}</h3>
          {subtitle && <p className="text-[13px] text-[var(--color-ink-soft)]">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
