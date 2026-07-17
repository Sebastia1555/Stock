// Mi cartera: posiciones valoradas a la fecha activa + registro de operaciones.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Transaction } from '../types.ts'
import { useAppDate } from '../lib/dateStore.ts'
import { removeTransaction, useTransactions } from '../lib/txStore.ts'
import { buildPortfolio, type PortfolioSummary, type PositionView } from '../lib/portfolio.ts'
import { money, pct, signedPct } from '../lib/format.ts'
import { Card, Pill, Stat } from '../components/ui.tsx'
import { Section } from '../components/Layout.tsx'

function EmptyState() {
  const steps = [
    { n: 1, title: 'Mira la recomendación de hoy', text: 'El motor filtra el S&P 500: solo negocios excelentes con descuento ≥ 25% sobre su valor intrínseco.' },
    { n: 2, title: 'Registra tu compra', text: 'Apunta precio, acciones y tu tesis. Poco y a menudo: la disciplina vence al genio.' },
    { n: 3, title: 'Sigue tu cartera', text: 'P/L por posición y total, peso de cada valor, y aviso si una posición pierde su tesis.' },
  ]
  return (
    <Card hero className="mt-6 p-7">
      <h2 className="text-[22px] font-semibold">Tu cartera empieza aquí</h2>
      <p className="mt-1 text-[15px] text-[var(--color-ink-soft)]">Así funciona Stock&Sebas, en tres pasos:</p>
      <ol className="mt-5 space-y-4">
        {steps.map((s) => (
          <li key={s.n} className="flex gap-3.5">
            <span className="num mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--color-accent)]/10 text-[14px] font-bold text-[var(--color-accent)]">
              {s.n}
            </span>
            <div>
              <div className="text-[15px] font-semibold">{s.title}</div>
              <div className="text-[14px] leading-snug text-[var(--color-ink-soft)]">{s.text}</div>
            </div>
          </li>
        ))}
      </ol>
      <Link
        to="/"
        className="mt-6 inline-block rounded-full bg-[var(--color-accent)] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-600)]"
      >
        Ver la recomendación de hoy
      </Link>
    </Card>
  )
}

function PositionRow({ p }: { p: PositionView }) {
  const gain = p.pl >= 0
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/valor/${p.ticker}`} className="text-[17px] font-semibold text-[var(--color-accent)]">
              {p.ticker}
            </Link>
            {p.thesisAtRisk && <Pill tone="loss">⚠ Tesis en riesgo</Pill>}
          </div>
          <p className="text-[13px] text-[var(--color-ink-soft)]">{p.name}</p>
        </div>
        <div className="text-right">
          <div className="num font-semibold">{money(p.currentValue)}</div>
          <div className={`num text-[13px] font-medium ${gain ? 'text-[var(--color-gain)]' : 'text-[var(--color-loss)]'}`}>
            {gain ? '+' : ''}
            {money(p.pl)} ({signedPct(p.plPct)})
          </div>
        </div>
      </div>
      <div className="num mt-2 flex flex-wrap justify-between gap-2 text-[13px] text-[var(--color-ink-soft)]">
        <span>
          {p.shares} acc. × {money(p.avgCost)} de coste medio · ahora {money(p.price)}
        </span>
        <span>{pct(p.weight)} de la cartera</span>
      </div>
      {p.thesisAtRisk && (
        <p className="mt-2 rounded-[10px] bg-[var(--color-loss)]/8 px-3 py-2 text-[13px] leading-snug text-[var(--color-loss)]">
          Los fundamentales se han deteriorado: este valor ya no pasaría el filtro de calidad. Revisa tu tesis original
          antes de ampliar.
        </p>
      )}
    </Card>
  )
}

function TransactionRow({ t }: { t: Transaction }) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-hairline)] py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={t.type === 'compra' ? 'accent' : 'neutral'}>{t.type === 'compra' ? 'Compra' : 'Venta'}</Pill>
          <span className="font-semibold">{t.ticker}</span>
          <span className="num text-[13px] text-[var(--color-ink-soft)]">{t.date}</span>
        </div>
        <div className="num mt-0.5 text-[13px] text-[var(--color-ink-soft)]">
          {t.shares} acc. × {money(t.price)}
          {t.fees > 0 ? ` · ${money(t.fees)} comisión` : ''}
        </div>
        {t.thesis && <p className="mt-0.5 line-clamp-1 text-[13px] italic text-[var(--color-ink-soft)]">“{t.thesis}”</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => navigate(`/registrar?id=${t.id}`)}
          className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-parchment)] px-3 py-1.5 text-[13px] font-semibold"
        >
          Editar
        </button>
        <button
          onClick={() => {
            if (confirm(`¿Eliminar esta operación de ${t.ticker}?`)) removeTransaction(t.id)
          }}
          className="rounded-full px-2 py-1.5 text-[13px] font-semibold text-[var(--color-loss)]"
        >
          Eliminar
        </button>
      </div>
    </div>
  )
}

export function Portfolio() {
  const date = useAppDate()
  const transactions = useTransactions()
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)

  useEffect(() => {
    let active = true
    buildPortfolio(transactions, date).then((s) => {
      if (active) setSummary(s)
    })
    return () => {
      active = false
    }
  }, [transactions, date])

  const hasActivity = transactions.length > 0

  return (
    <>
      <div className="pt-6">
        <h1 className="text-[28px] font-semibold">Mi cartera</h1>
        <p className="mt-1 text-[15px] text-[var(--color-ink-soft)]">
          Valorada con la cotización del día seleccionado.
        </p>
      </div>

      {!hasActivity ? (
        <EmptyState />
      ) : !summary ? (
        <div className="mt-8 animate-pulse text-[var(--color-ink-soft)]">Valorando posiciones…</div>
      ) : (
        <>
          <Card className="mt-5 p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Valor actual" value={money(summary.value)} />
              <Stat label="Invertido" value={money(summary.invested)} />
              <Stat
                label="P/L latente"
                value={`${summary.pl >= 0 ? '+' : ''}${money(summary.pl)}`}
                tone={summary.pl >= 0 ? 'gain' : 'loss'}
              />
              {summary.realized !== 0 ? (
                <Stat
                  label="P/L realizado"
                  value={`${summary.realized >= 0 ? '+' : ''}${money(summary.realized)}`}
                  tone={summary.realized >= 0 ? 'gain' : 'loss'}
                />
              ) : (
                <Stat label="Posiciones" value={summary.positions.length} />
              )}
            </div>
          </Card>

          {summary.positions.length > 0 ? (
            <Section title="Posiciones" subtitle={`Rentabilidad total: ${signedPct(summary.plPct)}`}>
              <div className="space-y-3">
                {summary.positions.map((p) => (
                  <PositionRow key={p.ticker} p={p} />
                ))}
              </div>
            </Section>
          ) : (
            <p className="mt-6 text-[14px] text-[var(--color-ink-soft)]">
              Sin posiciones abiertas (todo vendido). El historial de operaciones sigue abajo.
            </p>
          )}

          <Section title="Operaciones" subtitle="Editable y borrable. Se guarda localmente en tu dispositivo.">
            <Card className="px-4 py-1">
              {transactions
                .toSorted((a, b) => b.date.localeCompare(a.date))
                .map((t) => (
                  <TransactionRow key={t.id} t={t} />
                ))}
            </Card>
          </Section>
        </>
      )}
    </>
  )
}
