// Historial de recomendaciones: picks pasados del motor y su evolución (hit rate).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppDate } from '../lib/dateStore.ts'
import { buildEngineHistory, type EngineHistory } from '../lib/history.ts'
import { money, pct, signedPct } from '../lib/format.ts'
import { Card, ConvictionBadge, Stat } from '../components/ui.tsx'
import { Section } from '../components/Layout.tsx'

export function History() {
  const date = useAppDate()
  const [history, setHistory] = useState<EngineHistory | null>(null)

  useEffect(() => {
    let active = true
    setHistory(null)
    buildEngineHistory(date, 45).then((h) => {
      if (active) setHistory(h)
    })
    return () => {
      active = false
    }
  }, [date])

  return (
    <>
      <div className="pt-6">
        <h1 className="text-[28px] font-semibold">Historial del motor</h1>
        <p className="mt-1 text-[15px] text-[var(--color-ink-soft)]">
          Los picks de los últimos 45 días, valorados a la fecha seleccionada.
        </p>
      </div>

      {!history ? (
        <div className="mt-8 animate-pulse text-[var(--color-ink-soft)]">Reconstruyendo picks pasados…</div>
      ) : (
        <>
          <Card className="mt-5 p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat
                label="Baten al índice"
                value={history.hitRateVsSpy !== null ? pct(history.hitRateVsSpy) : '—'}
                tone={history.hitRateVsSpy !== null && history.hitRateVsSpy >= 0.5 ? 'gain' : 'loss'}
              />
              <Stat
                label="En positivo"
                value={history.positiveRate !== null ? pct(history.positiveRate) : '—'}
                tone={history.positiveRate !== null && history.positiveRate >= 0.5 ? 'gain' : 'loss'}
              />
              <Stat
                label="Retorno medio"
                value={history.avgReturn !== null ? signedPct(history.avgReturn) : '—'}
                tone={history.avgReturn !== null && history.avgReturn >= 0 ? 'gain' : 'loss'}
              />
              <Stat label="Días sin compra" value={`${history.noBuyDays} de ${history.daysScanned}`} />
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
              El hit rate principal mide si cada pick batió al S&amp;P 500 desde su fecha: seleccionar mejor que el
              índice es el trabajo del motor. «En positivo» depende además del momento del mercado. Los días sin compra
              también son una decisión: no forzar operaciones es parte de la estrategia.
            </p>
          </Card>

          <Section title="Picks pasados" subtitle="De más reciente a más antiguo.">
            {history.picks.length === 0 ? (
              <p className="text-[14px] text-[var(--color-ink-soft)]">Sin picks en el periodo analizado.</p>
            ) : (
              <Card className="px-4 py-1">
                {history.picks.map((p) => (
                  <Link
                    key={p.date}
                    to={`/valor/${p.ticker}`}
                    className="flex items-center justify-between gap-3 border-b border-[var(--color-hairline)] py-3 last:border-b-0"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{p.ticker}</span>
                        <ConvictionBadge conviction={p.conviction} />
                      </div>
                      <div className="num mt-0.5 text-[13px] text-[var(--color-ink-soft)]">
                        {p.date} · {money(p.priceThen)} → {money(p.priceNow)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`num font-semibold ${p.pickReturn >= 0 ? 'text-[var(--color-gain)]' : 'text-[var(--color-loss)]'}`}>
                        {signedPct(p.pickReturn)}
                      </div>
                      <div className="num text-[12px] text-[var(--color-ink-soft)]">
                        {p.vsSpy >= 0 ? '+' : ''}
                        {(p.vsSpy * 100).toFixed(1)} pp vs SPY
                      </div>
                    </div>
                  </Link>
                ))}
              </Card>
            )}
          </Section>
        </>
      )}
    </>
  )
}
