// Analizar una acción: buscador de ticker + los 10 KPIs de Buffett con veredicto,
// y debajo el coste de oportunidad: las mejores alternativas del día.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { Constituent, Fundamentals, MarketVerdict, Recommendation } from '../types.ts'
import { getFundamentals, getSP500Constituents } from '../data/provider.ts'
import { useAppDate } from '../lib/dateStore.ts'
import { analyzeTicker, getDailyVerdict } from '../lib/recommendations.ts'
import { buildBuffettKpis, type BuffettKpi } from '../lib/kpis.ts'
import { money, pct } from '../lib/format.ts'
import { Card, ConvictionBadge, Pill } from '../components/ui.tsx'
import { Section } from '../components/Layout.tsx'
import { CompactRecommendation } from '../components/RecommendationCard.tsx'

function VerdictBanner({ rec, passedCount }: { rec: Recommendation; passedCount: number }) {
  const buyPrice = rec.intrinsicValue > 0 ? rec.intrinsicValue * 0.75 : null

  if (rec.eligible) {
    return (
      <Card hero className="border-[var(--color-gain)]/40 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[20px] font-semibold text-[var(--color-gain)]">✓ Buen momento para invertir</span>
          <ConvictionBadge conviction={rec.conviction} />
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-ink-soft)]">
          Cumple <strong className="text-[var(--color-ink)]">{passedCount} de 10 criterios Buffett</strong>: negocio de
          calidad cotizando con un margen de seguridad del {pct(rec.marginOfSafety)} sobre su valor intrínseco de{' '}
          {money(rec.intrinsicValue)}.
        </p>
      </Card>
    )
  }
  if (rec.timing.valueTrap) {
    return (
      <Card hero className="border-[var(--color-loss)]/40 p-5">
        <span className="text-[20px] font-semibold text-[var(--color-loss)]">⚠ Posible value trap</span>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-ink-soft)]">
          Parece barata, pero la caída viene acompañada de deterioro del negocio. Barato + roto no es una ganga: es una
          trampa. Descártala.
        </p>
      </Card>
    )
  }
  if (rec.quality.passesHardFilter) {
    return (
      <Card hero className="border-[var(--color-warn)]/40 p-5">
        <span className="text-[20px] font-semibold text-[var(--color-warn)]">⏳ Gran negocio, mal precio</span>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-ink-soft)]">
          La calidad está ({passedCount} de 10 criterios), pero sin margen de seguridad no se compra.
          {buyPrice !== null && (
            <>
              {' '}
              Precio objetivo: <strong className="num text-[var(--color-ink)]">{money(buyPrice)}</strong> (25% de
              descuento sobre su valor de {money(rec.intrinsicValue)}). Ponla en la watchlist y espera.
            </>
          )}
        </p>
      </Card>
    )
  }
  return (
    <Card hero className="border-[var(--color-loss)]/40 p-5">
      <span className="text-[20px] font-semibold text-[var(--color-loss)]">✗ Evitar: no pasa el filtro de calidad</span>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-ink-soft)]">
        {rec.quality.failedFilters.join(' · ')}. Por barata que parezca, un mal negocio a buen precio sigue siendo un
        mal negocio.
      </p>
    </Card>
  )
}

function KpiRow({ kpi }: { kpi: BuffettKpi }) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--color-hairline)] py-3 last:border-b-0">
      <span
        aria-hidden="true"
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-bold ${
          kpi.passed ? 'bg-[var(--color-gain)]/12 text-[var(--color-gain)]' : 'bg-[var(--color-loss)]/12 text-[var(--color-loss)]'
        }`}
      >
        {kpi.passed ? '✓' : '✗'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-[14px] font-semibold">
            {kpi.label} <span className="sr-only">{kpi.passed ? 'cumple' : 'no cumple'}</span>
          </span>
          <span className={`num text-[14px] font-semibold ${kpi.passed ? 'text-[var(--color-gain)]' : 'text-[var(--color-loss)]'}`}>
            {kpi.value} <span className="text-[12px] font-normal text-[var(--color-ink-soft)]">({kpi.threshold})</span>
          </span>
        </div>
        <p className="text-[12px] leading-snug text-[var(--color-ink-soft)]">{kpi.hint}</p>
      </div>
    </div>
  )
}

export function Analyze() {
  const date = useAppDate()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const ticker = params.get('t') ?? ''

  const [query, setQuery] = useState('')
  const [universe, setUniverse] = useState<Constituent[]>([])
  const [rec, setRec] = useState<Recommendation | null>(null)
  const [fund, setFund] = useState<Fundamentals | null>(null)
  const [verdict, setVerdict] = useState<MarketVerdict | null>(null)

  useEffect(() => {
    getSP500Constituents().then(setUniverse)
  }, [])

  // Veredicto del día para "oportunidades" y "alternativas".
  useEffect(() => {
    let active = true
    setVerdict(null)
    getDailyVerdict(date).then((v) => {
      if (active) setVerdict(v)
    })
    return () => {
      active = false
    }
  }, [date])

  // Análisis del ticker seleccionado.
  useEffect(() => {
    if (!ticker) {
      setRec(null)
      setFund(null)
      return
    }
    let active = true
    setRec(null)
    Promise.all([analyzeTicker(ticker, date), getFundamentals(ticker, date)])
      .then(([r, f]) => {
        if (!active) return
        setRec(r)
        setFund(f)
      })
      .catch(() => {
        if (active) setParams({})
      })
    return () => {
      active = false
    }
  }, [ticker, date, setParams])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return universe
      .filter((c) => c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, universe])

  function select(t: string) {
    setParams({ t })
    setQuery('')
  }

  const kpis = rec && fund ? buildBuffettKpis(fund, rec) : []
  const passedCount = kpis.filter((k) => k.passed).length

  const eligibleToday = verdict ? [verdict.primary, ...verdict.alternatives].filter((r): r is Recommendation => r !== null) : []
  const alternatives = eligibleToday.filter((r) => r.ticker !== ticker).slice(0, 3)
  const nearBuy = verdict
    ? verdict.watchlist.toSorted((a, b) => b.marginOfSafety - a.marginOfSafety).slice(0, 3)
    : []

  return (
    <>
      <div className="pt-6">
        <h1 className="text-[28px] font-semibold">Analizar una acción</h1>
        <p className="mt-1 text-[15px] text-[var(--color-ink-soft)]">
          Los diez criterios de Warren Buffett aplicados a cualquier valor: primero el negocio, después el precio.
        </p>
      </div>

      {/* Buscador */}
      <div className="relative mt-5">
        <div className="flex items-center gap-2 rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-parchment)] px-3.5">
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="var(--color-ink-soft)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="7.5" cy="7.5" r="4.75" />
            <path d="M11.5 11.5L15 15" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches.length > 0) select(matches[0].ticker)
            }}
            placeholder="Busca por ticker o nombre (AAPL, Coca-Cola…)"
            aria-label="Buscar acción"
            className="w-full bg-transparent py-3 text-[15px] outline-none"
          />
        </div>
        {matches.length > 0 && (
          <Card className="absolute inset-x-0 z-20 mt-1.5 overflow-hidden shadow-[var(--shadow-product)]">
            {matches.map((c) => (
              <button
                key={c.ticker}
                onClick={() => select(c.ticker)}
                className="flex w-full items-baseline justify-between gap-3 border-b border-[var(--color-hairline)] px-4 py-2.5 text-left last:border-b-0 hover:bg-[var(--color-parchment)]"
              >
                <span>
                  <span className="font-semibold">{c.ticker}</span>{' '}
                  <span className="text-[13px] text-[var(--color-ink-soft)]">{c.name}</span>
                </span>
                <span className="text-[12px] text-[var(--color-ink-soft)]">{c.sector}</span>
              </button>
            ))}
          </Card>
        )}
      </div>

      {/* Chips de acceso rápido cuando no hay selección */}
      {!ticker && universe.length > 0 && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" role="list" aria-label="Valores disponibles">
          {universe.map((c) => (
            <button
              key={c.ticker}
              onClick={() => select(c.ticker)}
              className="num shrink-0 rounded-full border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 py-1.5 text-[13px] font-semibold hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              {c.ticker}
            </button>
          ))}
        </div>
      )}

      {/* Análisis del valor seleccionado */}
      {ticker && (!rec || !fund) && (
        <div className="mt-8 animate-pulse text-[var(--color-ink-soft)]">Analizando {ticker}…</div>
      )}

      {ticker && rec && fund && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[22px] font-semibold">{rec.ticker}</span>{' '}
              <span className="text-[15px] text-[var(--color-ink-soft)]">
                {rec.name} · {rec.sector}
              </span>
            </div>
            <span className="num text-[22px] font-semibold">{money(rec.price)}</span>
          </div>

          <div className="mt-3">
            <VerdictBanner rec={rec} passedCount={passedCount} />
          </div>

          <Section
            title={`Criterios Buffett: ${passedCount} de 10`}
            subtitle="Siete miden el negocio; tres, el precio. Los dos grupos deben acompañar."
          >
            <Card className="px-4 py-1">
              <div className="px-0 pt-3 pb-1 text-[12px] font-semibold tracking-wide text-[var(--color-ink-soft)] uppercase">
                El negocio
              </div>
              {kpis.filter((k) => k.group === 'negocio').map((k) => (
                <KpiRow key={k.id} kpi={k} />
              ))}
              <div className="px-0 pt-4 pb-1 text-[12px] font-semibold tracking-wide text-[var(--color-ink-soft)] uppercase">
                El precio
              </div>
              {kpis.filter((k) => k.group === 'precio').map((k) => (
                <KpiRow key={k.id} kpi={k} />
              ))}
            </Card>
          </Section>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {rec.eligible && (
              <button
                onClick={() => navigate(`/registrar?ticker=${rec.ticker}`)}
                className="w-full rounded-full bg-[var(--color-accent)] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-600)] sm:w-auto"
              >
                Registrar compra
              </button>
            )}
            <Link
              to={`/valor/${rec.ticker}`}
              className="w-full rounded-full border border-[var(--color-hairline)] bg-[var(--color-parchment)] px-6 py-3 text-center text-[15px] font-semibold sm:w-auto"
            >
              Ver análisis completo →
            </Link>
          </div>

          {alternatives.length > 0 && (
            <Section
              title="Antes de decidir, compara"
              subtitle="Coste de oportunidad: hoy también puedes comprar estos negocios con margen de seguridad."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {alternatives.map((r) => (
                  <CompactRecommendation key={r.ticker} rec={r} />
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {/* Sin selección: info del día y alternativas */}
      {!ticker && (
        <>
          <Section title="Mejores oportunidades hoy" subtitle="Elegibles del motor: calidad + margen de seguridad ≥ 25%.">
            {!verdict ? (
              <div className="animate-pulse text-[var(--color-ink-soft)]">Analizando el S&amp;P 500…</div>
            ) : eligibleToday.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {eligibleToday.slice(0, 4).map((r) => (
                  <CompactRecommendation key={r.ticker} rec={r} />
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-[var(--color-ink-soft)]">
                Hoy no hay compra con margen suficiente. La liquidez también es una posición.
              </p>
            )}
          </Section>

          {nearBuy.length > 0 && (
            <Section title="A punto de caramelo" subtitle="Excelentes aún caros, ordenados por cercanía a su precio de compra.">
              <Card className="px-4 py-1">
                {nearBuy.map((r) => {
                  const buyPrice = r.intrinsicValue > 0 ? r.intrinsicValue * 0.75 : null
                  return (
                    <button
                      key={r.ticker}
                      onClick={() => select(r.ticker)}
                      className="flex w-full items-center justify-between gap-3 border-b border-[var(--color-hairline)] py-3 text-left last:border-b-0"
                    >
                      <span>
                        <span className="font-semibold">{r.ticker}</span>{' '}
                        <span className="text-[13px] text-[var(--color-ink-soft)]">{r.name}</span>
                      </span>
                      {buyPrice !== null && (
                        <Pill tone="accent">
                          Compraría a {money(buyPrice)}
                        </Pill>
                      )}
                    </button>
                  )
                })}
              </Card>
            </Section>
          )}
        </>
      )}
    </>
  )
}
