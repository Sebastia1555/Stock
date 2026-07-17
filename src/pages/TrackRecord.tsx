// Track record: evolución del patrimonio vs S&P 500 y estadísticas de la estrategia.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppDate } from '../lib/dateStore.ts'
import { useTransactions } from '../lib/txStore.ts'
import { buildTrackRecord, type TrackRecord } from '../lib/trackRecord.ts'
import { money, pct, signedPct } from '../lib/format.ts'
import { Card, Pill, Stat } from '../components/ui.tsx'
import { Section } from '../components/Layout.tsx'
import { LineChart } from '../components/LineChart.tsx'

function EmptyState() {
  return (
    <Card hero className="mt-6 p-7 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[var(--color-accent)]/10 text-[22px]">📈</div>
      <h2 className="text-[22px] font-semibold">Aún no hay historial que medir</h2>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-[var(--color-ink-soft)]">
        Cuando registres tu primera operación, aquí verás la evolución de tu patrimonio, tu rentabilidad frente al
        S&amp;P 500 y las estadísticas de tu disciplina.
      </p>
      <Link
        to="/registrar"
        className="mt-5 inline-block rounded-full bg-[var(--color-accent)] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-600)]"
      >
        Registrar mi primera compra
      </Link>
    </Card>
  )
}

export function TrackRecordPage() {
  const date = useAppDate()
  const transactions = useTransactions()
  const [record, setRecord] = useState<TrackRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    buildTrackRecord(transactions, date).then((r) => {
      if (!active) return
      setRecord(r)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [transactions, date])

  const vsSpy = record ? record.simpleReturn - record.spyReturn : 0
  const best = record?.outcomes[0]
  const worst = record && record.outcomes.length > 1 ? record.outcomes[record.outcomes.length - 1] : null

  return (
    <>
      <div className="pt-6">
        <h1 className="text-[28px] font-semibold">Track record</h1>
        <p className="mt-1 text-[15px] text-[var(--color-ink-soft)]">
          Tu estrategia frente a comprar el índice con los mismos flujos.
        </p>
      </div>

      {transactions.length === 0 ? (
        <EmptyState />
      ) : loading || !record ? (
        <div className="mt-8 animate-pulse text-[var(--color-ink-soft)]">Reconstruyendo el historial…</div>
      ) : (
        <>
          <Card className="mt-5 p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat
                label="Rentabilidad total"
                value={signedPct(record.simpleReturn)}
                tone={record.simpleReturn >= 0 ? 'gain' : 'loss'}
              />
              <Stat label="vs S&P 500" value={`${vsSpy >= 0 ? '+' : ''}${(vsSpy * 100).toFixed(1)} pp`} tone={vsSpy >= 0 ? 'gain' : 'loss'} />
              <Stat label="TWR" value={signedPct(record.twr)} tone={record.twr >= 0 ? 'gain' : 'loss'} />
              <Stat
                label="XIRR anualizada"
                value={record.xirr !== null ? signedPct(record.xirr) : '—'}
                tone={record.xirr !== null ? (record.xirr >= 0 ? 'gain' : 'loss') : undefined}
              />
            </div>
            {record.xirr === null && record.days < 30 && (
              <p className="mt-3 text-[12px] text-[var(--color-ink-soft)]">
                La XIRR anualizada se muestra a partir de 30 días de historial: antes, anualizar distorsiona.
              </p>
            )}
          </Card>

          <Section
            title="Evolución del patrimonio"
            subtitle={`${record.days} días desde tu primera operación. La línea del S&P 500 invierte tus mismos flujos en el índice.`}
          >
            <Card className="p-5">
              <LineChart
                series={[
                  { label: 'Mi cartera', color: 'var(--color-accent)', points: record.points.map((p) => ({ date: p.date, value: p.value })) },
                  { label: 'S&P 500 (mismos flujos)', color: 'var(--color-ink-soft)', points: record.points.map((p) => ({ date: p.date, value: p.spyValue })) },
                  { label: 'Aportado neto', color: 'var(--color-warn)', dashed: true, points: record.points.map((p) => ({ date: p.date, value: p.invested })) },
                ]}
              />
            </Card>
          </Section>

          <Section title="Estadísticas">
            <Card className="p-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Operaciones" value={record.nOperations} />
                <Stat label="Win rate" value={record.winRate !== null ? pct(record.winRate) : '—'} />
                <Stat
                  label="Mejor posición"
                  value={
                    best ? (
                      <span className="flex items-baseline gap-1.5">
                        {best.ticker}
                        <span className="text-[13px] font-medium text-[var(--color-gain)]">
                          {best.pl >= 0 ? '+' : ''}
                          {money(best.pl)}
                        </span>
                      </span>
                    ) : (
                      '—'
                    )
                  }
                />
                <Stat
                  label="Peor posición"
                  value={
                    worst ? (
                      <span className="flex items-baseline gap-1.5">
                        {worst.ticker}
                        <span className={`text-[13px] font-medium ${worst.pl >= 0 ? 'text-[var(--color-gain)]' : 'text-[var(--color-loss)]'}`}>
                          {worst.pl >= 0 ? '+' : ''}
                          {money(worst.pl)}
                        </span>
                      </span>
                    ) : (
                      '—'
                    )
                  }
                />
              </div>
              {record.winRate !== null && (
                <p className="mt-4 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
                  {record.winRate >= 0.5
                    ? 'La mayoría de tus posiciones van en positivo. Recuerda: el objetivo no es acertar siempre, sino que las ganadoras pesen más que las perdedoras.'
                    : 'Más posiciones en rojo que en verde. Revisa si compraste con margen de seguridad suficiente o si alguna tesis se ha deteriorado.'}
                </p>
              )}
            </Card>
          </Section>

          {record.outcomes.length > 0 && (
            <Section title="P/L por valor" subtitle="Realizado + latente, de mejor a peor.">
              <Card className="px-4 py-1">
                {record.outcomes.map((o) => (
                  <div key={o.ticker} className="flex items-center justify-between border-b border-[var(--color-hairline)] py-2.5 last:border-b-0">
                    <span className="font-semibold">{o.ticker}</span>
                    <Pill tone={o.pl >= 0 ? 'gain' : 'loss'}>
                      {o.pl >= 0 ? '+' : ''}
                      {money(o.pl)}
                    </Pill>
                  </div>
                ))}
              </Card>
            </Section>
          )}
        </>
      )}
    </>
  )
}
