// Home / Recomendación del día.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MarketVerdict, PricePoint } from '../types.ts'
import { getPriceHistory } from '../data/provider.ts'
import { useAppDate } from '../lib/dateStore.ts'
import { getDailyVerdict } from '../lib/recommendations.ts'
import { formatDateEs } from '../lib/format.ts'
import { Section } from '../components/Layout.tsx'
import { CompactRecommendation, HeroRecommendation } from '../components/RecommendationCard.tsx'
import { Card, Stat } from '../components/ui.tsx'

function MarketVerdictBar({ verdict }: { verdict: MarketVerdict }) {
  return (
    <Card className="p-5">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Analizados" value={verdict.analyzed} />
        <Stat label="Pasan calidad" value={verdict.passQuality} />
        <Stat label="Elegibles hoy" value={verdict.eligible} tone={verdict.eligible > 0 ? 'gain' : 'warn'} />
      </div>
    </Card>
  )
}

function NoBuyMessage() {
  return (
    <Card hero className="p-8 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[var(--color-warn)]/12 text-[22px]">☕</div>
      <h2 className="text-[22px] font-semibold">Hoy no hay compra con margen de seguridad suficiente</h2>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-[var(--color-ink-soft)]">
        Ningún valor del universo combina calidad Buffett con un descuento ≥ 25% sobre su valor intrínseco. Lo
        disciplinado es <strong className="text-[var(--color-ink)]">acumular liquidez</strong> o reforzar tu mejor idea
        existente. Comprar calidad cara o basura barata está prohibido por diseño.
      </p>
    </Card>
  )
}

export function Home() {
  const date = useAppDate()
  const navigate = useNavigate()
  const [verdict, setVerdict] = useState<MarketVerdict | null>(null)
  const [primaryHistory, setPrimaryHistory] = useState<PricePoint[] | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    getDailyVerdict(date).then(async (v) => {
      const history = v.primary ? await getPriceHistory(v.primary.ticker, '1y') : undefined
      if (!active) return
      setVerdict(v)
      setPrimaryHistory(history)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [date])

  return (
    <>
      <div className="pt-6">
        <h1 className="text-[28px] font-semibold">Recomendación del día</h1>
        <p className="mt-1 text-[15px] text-[var(--color-ink-soft)] first-letter:uppercase">{formatDateEs(date)}</p>
      </div>

      {loading || !verdict ? (
        <div className="mt-8 animate-pulse text-[var(--color-ink-soft)]">Analizando el S&amp;P 500…</div>
      ) : (
        <>
          <div className="mt-5">
            <MarketVerdictBar verdict={verdict} />
          </div>

          <div className="mt-6">
            {verdict.primary ? (
              <HeroRecommendation
                rec={verdict.primary}
                history={primaryHistory}
                onRegister={() => navigate(`/registrar?ticker=${verdict.primary?.ticker}`)}
              />
            ) : (
              <NoBuyMessage />
            )}
          </div>

          {verdict.alternatives.length > 0 && (
            <Section title="Alternativas" subtitle="Otras ideas que también pasan calidad y margen de seguridad.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {verdict.alternatives.map((r) => (
                  <CompactRecommendation key={r.ticker} rec={r} />
                ))}
              </div>
            </Section>
          )}

          <Section title="Watchlist" subtitle="Negocios excelentes que aún no están baratos: la lista de la compra.">
            {verdict.watchlist.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {verdict.watchlist.slice(0, 6).map((r) => (
                  <CompactRecommendation key={r.ticker} rec={r} showMos={false} />
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-[var(--color-ink-soft)]">Sin valores en watchlist hoy.</p>
            )}
          </Section>
        </>
      )}
    </>
  )
}
