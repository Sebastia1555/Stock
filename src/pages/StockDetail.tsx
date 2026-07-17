// Detalle de acción: checklist Buffett, valoración, gráfico y fundamentales a 10 años.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Fundamentals, PricePoint, Recommendation } from '../types.ts'
import { getFundamentals, getPriceHistory } from '../data/provider.ts'
import { useAppDate } from '../lib/dateStore.ts'
import { analyzeTicker } from '../lib/recommendations.ts'
import { money, num, pct, signedPct } from '../lib/format.ts'
import { Card, ConvictionBadge, Pill, ScoreBar, Stat } from '../components/ui.tsx'
import { Section } from '../components/Layout.tsx'
import { LineChart } from '../components/LineChart.tsx'

interface CheckItem {
  question: string
  passed: boolean
  detail: string
}

function buildChecklist(f: Fundamentals, rec: Recommendation): CheckItem[] {
  const a = f.annual
  const fcfPositiveYears = a.filter((x) => x.fcfPerShare > 0).length
  const lossYears = a.filter((x) => x.eps < 0).length
  return [
    {
      question: '¿Tiene foso defensivo?',
      passed: rec.quality.avgRoic >= 15,
      detail: `ROIC medio 10a del ${rec.quality.avgRoic.toFixed(0)}% (exigimos ≥ 15%): ${
        rec.quality.avgRoic >= 15 ? 'rentabilidad del capital propia de un negocio con ventaja competitiva.' : 'sin evidencia de ventaja competitiva duradera.'
      }`,
    },
    {
      question: '¿Balance sano?',
      passed: rec.quality.debtToEbitda < 3,
      detail: `Deuda/EBITDA de ${rec.quality.debtToEbitda.toFixed(1)} (exigimos < 3): ${
        rec.quality.debtToEbitda < 3 ? 'podría pagar su deuda con pocos años de beneficio.' : 'apalancamiento excesivo para dormir tranquilo.'
      }`,
    },
    {
      question: '¿Beneficios predecibles?',
      passed: fcfPositiveYears >= 8 && lossYears <= 1,
      detail: `FCF positivo en ${fcfPositiveYears} de 10 años y ${lossYears} año(s) en pérdidas: ${
        fcfPositiveYears >= 8 && lossYears <= 1 ? 'generación de caja consistente.' : 'resultados demasiado erráticos para proyectar.'
      }`,
    },
    {
      question: '¿Precio con descuento?',
      passed: rec.marginOfSafety >= 0.25,
      detail:
        rec.intrinsicValue > 0
          ? `Margen de seguridad del ${pct(rec.marginOfSafety)} sobre un valor intrínseco de ${money(rec.intrinsicValue)} (exigimos ≥ 25%).`
          : 'Sin valor intrínseco fiable: el DCF conservador no da un valor positivo.',
    },
  ]
}

export function StockDetail() {
  const { ticker = '' } = useParams()
  const date = useAppDate()
  const navigate = useNavigate()
  const [rec, setRec] = useState<Recommendation | null>(null)
  const [fund, setFund] = useState<Fundamentals | null>(null)
  const [history, setHistory] = useState<PricePoint[]>([])
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let active = true
    setRec(null)
    Promise.all([analyzeTicker(ticker, date), getFundamentals(ticker, date), getPriceHistory(ticker, '1y', date)])
      .then(([r, f, h]) => {
        if (!active) return
        setRec(r)
        setFund(f)
        setHistory(h)
      })
      .catch(() => {
        if (active) setNotFound(true)
      })
    return () => {
      active = false
    }
  }, [ticker, date])

  if (notFound) {
    return (
      <div className="pt-10 text-center">
        <p className="text-[17px]">No encontramos el valor «{ticker}».</p>
        <Link to="/" className="mt-3 inline-block font-semibold text-[var(--color-accent)]">
          Volver a la recomendación del día
        </Link>
      </div>
    )
  }

  if (!rec || !fund) {
    return <div className="mt-10 animate-pulse text-[var(--color-ink-soft)]">Analizando {ticker}…</div>
  }

  const checklist = buildChecklist(fund, rec)
  const passedAll = checklist.every((c) => c.passed)
  const buyPrice = rec.intrinsicValue > 0 ? rec.intrinsicValue * 0.75 : null

  return (
    <>
      <div className="pt-6">
        <button onClick={() => navigate(-1)} className="text-[14px] font-semibold text-[var(--color-accent)]">
          ← Volver
        </button>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[28px] leading-none font-semibold">{rec.ticker}</h1>
              {rec.eligible ? <ConvictionBadge conviction={rec.conviction} /> : rec.timing.valueTrap ? <Pill tone="loss">Value trap</Pill> : rec.quality.passesHardFilter ? <Pill tone="accent">Watchlist</Pill> : <Pill tone="loss">No pasa calidad</Pill>}
            </div>
            <p className="mt-1 text-[15px] text-[var(--color-ink-soft)]">
              {rec.name} · {rec.sector}
            </p>
          </div>
          <div className="text-right">
            <div className="num text-[28px] font-semibold">{money(rec.price)}</div>
            <div className="num text-[13px] text-[var(--color-loss)]">{signedPct(rec.drawdown)} desde máximos</div>
          </div>
        </div>
      </div>

      <Card hero className="mt-5 p-5">
        <h2 className="text-[17px] font-semibold">Checklist Buffett</h2>
        <ul className="mt-3 space-y-3">
          {checklist.map((c) => (
            <li key={c.question} className="flex gap-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-bold ${
                  c.passed ? 'bg-[var(--color-gain)]/12 text-[var(--color-gain)]' : 'bg-[var(--color-loss)]/12 text-[var(--color-loss)]'
                }`}
              >
                {c.passed ? '✓' : '✗'}
              </span>
              <div>
                <div className="text-[15px] font-semibold">
                  {c.question} <span className="sr-only">{c.passed ? 'Sí' : 'No'}</span>
                </div>
                <p className="text-[13px] leading-snug text-[var(--color-ink-soft)]">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className={`mt-4 rounded-[10px] px-3 py-2 text-[14px] font-medium ${passedAll ? 'bg-[var(--color-gain)]/10 text-[var(--color-gain)]' : 'bg-[var(--color-parchment)] text-[var(--color-ink-soft)]'}`}>
          {passedAll
            ? 'Pasa el checklist completo: negocio excelente a precio razonable.'
            : rec.quality.passesHardFilter && !rec.eligible && buyPrice
              ? `Negocio excelente pero caro. Precio de compra con margen del 25%: ${money(buyPrice)}.`
              : 'No cumple los requisitos para comprar hoy. La disciplina manda.'}
        </p>
        {rec.eligible && (
          <button
            onClick={() => navigate(`/registrar?ticker=${rec.ticker}`)}
            className="mt-4 w-full rounded-full bg-[var(--color-accent)] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-600)] sm:w-auto"
          >
            Registrar compra
          </button>
        )}
      </Card>

      <Section title="Tesis">
        <p className="text-[15px] leading-relaxed">{rec.thesis}</p>
      </Section>

      <Section title="Cotización" subtitle="Último año.">
        <Card className="p-5">
          <LineChart series={[{ label: rec.ticker, color: 'var(--color-accent)', points: history.map((h) => ({ date: h.date, value: h.close })) }]} />
        </Card>
      </Section>

      <Section title="Valoración">
        <Card className="p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Valor intrínseco (DCF)" value={money(rec.intrinsicValue)} />
            <Stat
              label="Margen de seguridad"
              value={pct(rec.marginOfSafety)}
              tone={rec.marginOfSafety >= 0.25 ? 'gain' : 'loss'}
            />
            <Stat label="Nº de Graham" value={money(rec.valuation.grahamNumber)} />
            <Stat label="P/E actual vs medio" value={`${rec.valuation.peCurrent.toFixed(1)} / ${rec.valuation.peAvg10.toFixed(1)}`} />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ScoreBar label="Calidad" value={rec.quality.score} />
            <ScoreBar label="Valoración" value={rec.valuation.score} />
            <ScoreBar label="Timing" value={rec.timing.score} />
          </div>
        </Card>
      </Section>

      <Section title="Fundamentales" subtitle="Diez años de historia.">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="num w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="bg-[var(--color-parchment)] text-left text-[var(--color-ink-soft)]">
                  <th className="px-3 py-2 font-medium">Año</th>
                  <th className="px-3 py-2 text-right font-medium">Ingresos (M$)</th>
                  <th className="px-3 py-2 text-right font-medium">BPA</th>
                  <th className="px-3 py-2 text-right font-medium">FCF/acc.</th>
                  <th className="px-3 py-2 text-right font-medium">ROE</th>
                  <th className="px-3 py-2 text-right font-medium">ROIC</th>
                  <th className="px-3 py-2 text-right font-medium">Margen op.</th>
                  <th className="px-3 py-2 text-right font-medium">Deuda/EBITDA</th>
                </tr>
              </thead>
              <tbody>
                {fund.annual
                  .toSorted((a, b) => b.year - a.year)
                  .map((a) => (
                    <tr key={a.year} className="border-t border-[var(--color-hairline)]">
                      <td className="px-3 py-2 font-semibold">{a.year}</td>
                      <td className="px-3 py-2 text-right">{num(a.revenue)}</td>
                      <td className={`px-3 py-2 text-right ${a.eps < 0 ? 'text-[var(--color-loss)]' : ''}`}>{a.eps.toFixed(2)}</td>
                      <td className={`px-3 py-2 text-right ${a.fcfPerShare < 0 ? 'text-[var(--color-loss)]' : ''}`}>{a.fcfPerShare.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{a.roe.toFixed(0)}%</td>
                      <td className="px-3 py-2 text-right">{a.roic.toFixed(0)}%</td>
                      <td className="px-3 py-2 text-right">{a.operatingMargin.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right">{a.ebitda > 0 ? (a.debt / a.ebitda).toFixed(1) : '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>
    </>
  )
}
