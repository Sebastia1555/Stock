// Tarjeta de recomendación: variante 'hero' (pick principal) y 'compact' (alternativas/watchlist).
import { Link } from 'react-router-dom'
import type { PricePoint, Recommendation } from '../types.ts'
import { money, pct, signedPct } from '../lib/format.ts'
import { Card, ConvictionBadge, Pill, ScoreBar, Stat } from './ui.tsx'
import { Sparkline } from './Sparkline.tsx'

function MosPill({ mos }: { mos: number }) {
  const tone = mos >= 0.25 ? 'gain' : 'loss'
  return <Pill tone={tone}>Margen de seguridad {pct(mos)}</Pill>
}

export function HeroRecommendation({ rec, history, onRegister }: { rec: Recommendation; history?: PricePoint[]; onRegister?: () => void }) {
  return (
    <Card hero className="overflow-hidden">
      <div className="border-b border-[var(--color-hairline)] bg-[var(--color-parchment)] px-6 py-3 text-[13px] font-medium text-[var(--color-ink-soft)]">
        Recomendación del día · {rec.sector}
      </div>
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-[28px] leading-none font-semibold">{rec.ticker}</h2>
              <ConvictionBadge conviction={rec.conviction} />
            </div>
            <p className="mt-1 text-[var(--color-ink-soft)]">{rec.name}</p>
          </div>
          <div className="text-right">
            <div className="num text-[28px] font-semibold">{money(rec.price)}</div>
            <div className="num text-[13px] text-[var(--color-loss)]">{signedPct(rec.drawdown)} desde máximos</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <MosPill mos={rec.marginOfSafety} />
          <Pill tone="accent">Valor intrínseco {money(rec.intrinsicValue)}</Pill>
          <Pill>Puntuación {rec.totalScore}/100</Pill>
        </div>

        <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-ink)]">{rec.thesis}</p>

        {history && (
          <div className="mt-5">
            <Sparkline data={history} width={520} height={72} />
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ScoreBar label="Calidad" value={rec.quality.score} />
          <ScoreBar label="Valoración" value={rec.valuation.score} />
          <ScoreBar label="Timing" value={rec.timing.score} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--color-hairline)] pt-5 sm:grid-cols-4">
          <Stat label="ROIC medio 10a" value={pct(rec.quality.avgRoic / 100, 0)} />
          <Stat label="Deuda / EBITDA" value={rec.quality.debtToEbitda.toFixed(1)} />
          <Stat label="P/E actual" value={rec.valuation.peCurrent.toFixed(1)} />
          <Stat label="Nº de Graham" value={money(rec.valuation.grahamNumber)} />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={onRegister}
            className="w-full rounded-full bg-[var(--color-accent)] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-600)] sm:w-auto"
          >
            Registrar compra
          </button>
          <Link
            to={`/valor/${rec.ticker}`}
            className="w-full rounded-full border border-[var(--color-hairline)] bg-[var(--color-parchment)] px-6 py-3 text-center text-[15px] font-semibold text-[var(--color-ink)] sm:w-auto"
          >
            Ver análisis completo
          </Link>
        </div>
      </div>
    </Card>
  )
}

export function CompactRecommendation({ rec, showMos = true }: { rec: Recommendation; showMos?: boolean }) {
  return (
    <Link to={`/valor/${rec.ticker}`} className="block">
      <Card className="h-full p-4 transition-colors hover:border-[var(--color-accent)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[17px] font-semibold">{rec.ticker}</span>
              {showMos ? <ConvictionBadge conviction={rec.conviction} /> : <Pill tone="accent">Watchlist</Pill>}
            </div>
            <p className="text-[13px] text-[var(--color-ink-soft)]">{rec.name}</p>
          </div>
          <div className="text-right">
            <div className="num font-semibold">{money(rec.price)}</div>
            {showMos ? (
              <div className={`num text-[13px] ${rec.marginOfSafety >= 0.25 ? 'text-[var(--color-gain)]' : 'text-[var(--color-loss)]'}`}>
                MoS {pct(rec.marginOfSafety)}
              </div>
            ) : (
              <div className="num text-[13px] text-[var(--color-ink-soft)]">Calidad {rec.quality.score}</div>
            )}
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-[var(--color-ink-soft)]">{rec.thesis}</p>
      </Card>
    </Link>
  )
}
