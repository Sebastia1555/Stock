// Watchlist: negocios excelentes que aún no están baratos, con su precio de compra objetivo.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { MarketVerdict } from '../types.ts'
import { useAppDate } from '../lib/dateStore.ts'
import { getDailyVerdict } from '../lib/recommendations.ts'
import { money, pct } from '../lib/format.ts'
import { Card, Pill } from '../components/ui.tsx'

export function Watchlist() {
  const date = useAppDate()
  const [verdict, setVerdict] = useState<MarketVerdict | null>(null)

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

  return (
    <>
      <div className="pt-6">
        <h1 className="text-[28px] font-semibold">Watchlist</h1>
        <p className="mt-1 text-[15px] text-[var(--color-ink-soft)]">
          La lista de la compra: calidad probada esperando su precio. Paciencia, no persecución.
        </p>
      </div>

      {!verdict ? (
        <div className="mt-8 animate-pulse text-[var(--color-ink-soft)]">Analizando el S&amp;P 500…</div>
      ) : verdict.watchlist.length === 0 ? (
        <Card className="mt-6 p-6 text-center text-[15px] text-[var(--color-ink-soft)]">
          Hoy no hay negocios excelentes caros: o son comprables o no pasan calidad.
        </Card>
      ) : (
        <div className="mt-5 space-y-3">
          {verdict.watchlist.map((r) => {
            const buyPrice = r.intrinsicValue > 0 ? r.intrinsicValue * 0.75 : null
            const premium = r.intrinsicValue > 0 ? r.price / r.intrinsicValue - 1 : null
            return (
              <Link key={r.ticker} to={`/valor/${r.ticker}`} className="block">
                <Card className="p-4 transition-colors hover:border-[var(--color-accent)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[17px] font-semibold">{r.ticker}</span>
                        <Pill>Calidad {r.quality.score}</Pill>
                      </div>
                      <p className="text-[13px] text-[var(--color-ink-soft)]">
                        {r.name} · {r.sector}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="num font-semibold">{money(r.price)}</div>
                      {premium !== null && (
                        <div className="num text-[13px] text-[var(--color-ink-soft)]">{pct(premium)} sobre su valor</div>
                      )}
                    </div>
                  </div>
                  {buyPrice !== null && (
                    <p className="num mt-2 rounded-[10px] bg-[var(--color-parchment)] px-3 py-2 text-[13px]">
                      Compraría a <strong className="font-semibold">{money(buyPrice)}</strong> (margen de seguridad del
                      25% sobre {money(r.intrinsicValue)}).
                    </p>
                  )}
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
