// Track record: curva de patrimonio diaria, comparación vs SPY (mismos flujos),
// TWR (rentabilidad ponderada por tiempo), XIRR (ponderada por dinero) y estadísticas.
import type { Transaction } from '../types.ts'
import { getBenchmarkPriceOn, getPriceOn } from '../data/provider.ts'

export interface TrackPoint {
  date: string
  value: number // patrimonio de la cartera
  invested: number // aportaciones netas acumuladas
  spyValue: number // valor de invertir los mismos flujos en SPY
}

export interface PositionOutcome {
  ticker: string
  pl: number // P/L total (realizado + latente)
}

export interface TrackRecord {
  points: TrackPoint[]
  days: number
  simpleReturn: number // (valor + ventas netas − aportado) / aportado
  twr: number
  xirr: number | null // anualizada; null si el periodo es demasiado corto o no converge
  spyReturn: number // rentabilidad de la cartera-sombra en SPY con los mismos flujos
  nOperations: number
  winRate: number | null
  outcomes: PositionOutcome[] // ordenadas de mejor a peor
}

/** TIR de flujos con fechas (XIRR) por bisección. Compras negativas, ventas/valor final positivos. */
export function xirr(flows: { date: string; amount: number }[]): number | null {
  if (flows.length < 2) return null
  const t0 = Date.parse(flows[0].date)
  const yearsOf = (d: string) => (Date.parse(d) - t0) / (365.25 * 86_400_000)
  const npv = (r: number) => flows.reduce((s, f) => s + f.amount / Math.pow(1 + r, yearsOf(f.date)), 0)
  let lo = -0.95
  let hi = 20
  let flo = npv(lo)
  const fhi = npv(hi)
  if (flo * fhi > 0) return null
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const fm = npv(mid)
    if (Math.abs(fm) < 1e-8) return mid
    if (flo * fm < 0) {
      hi = mid
    } else {
      lo = mid
      flo = fm
    }
  }
  return (lo + hi) / 2
}

function dateRange(from: string, to: string): string[] {
  const out: string[] = []
  let t = Date.parse(from + 'T00:00:00Z')
  const end = Date.parse(to + 'T00:00:00Z')
  while (t <= end) {
    out.push(new Date(t).toISOString().slice(0, 10))
    t += 86_400_000
  }
  return out
}

export async function buildTrackRecord(
  transactions: Transaction[],
  endDate: string,
): Promise<TrackRecord | null> {
  const txs = transactions
    .filter((t) => t.date <= endDate)
    .toSorted((a, b) => a.date.localeCompare(b.date))
  if (txs.length === 0) return null

  const startDate = txs[0].date
  const tickers = [...new Set(txs.map((t) => t.ticker))]

  // Estado por día
  const shares = new Map<string, number>()
  const costBasis = new Map<string, number>() // coste medio restante por ticker
  const realized = new Map<string, number>()
  let spyShares = 0
  let invested = 0 // aportaciones netas acumuladas (compras − ventas, con comisiones)
  let txIdx = 0

  const points: TrackPoint[] = []
  let twr = 1
  let prevValue = 0

  for (const date of dateRange(startDate, endDate)) {
    // 1) Aplica las operaciones del día (flujo al inicio del día).
    let dayFlow = 0
    while (txIdx < txs.length && txs[txIdx].date === date) {
      const t = txs[txIdx]
      const spyPrice = await getBenchmarkPriceOn(date)
      if (t.type === 'compra') {
        const cost = t.price * t.shares + t.fees
        shares.set(t.ticker, (shares.get(t.ticker) ?? 0) + t.shares)
        costBasis.set(t.ticker, (costBasis.get(t.ticker) ?? 0) + cost)
        invested += cost
        dayFlow += cost
        spyShares += cost / spyPrice
      } else {
        const held = shares.get(t.ticker) ?? 0
        const basis = costBasis.get(t.ticker) ?? 0
        const avg = held > 0 ? basis / held : 0
        const sold = Math.min(t.shares, held)
        const proceeds = t.price * sold - t.fees
        realized.set(t.ticker, (realized.get(t.ticker) ?? 0) + (t.price - avg) * sold - t.fees)
        shares.set(t.ticker, held - sold)
        costBasis.set(t.ticker, basis - avg * sold)
        invested -= proceeds
        dayFlow -= proceeds
        spyShares -= proceeds / spyPrice
      }
      txIdx++
    }

    // 2) Valora la cartera y la sombra en SPY al cierre.
    let value = 0
    for (const tk of tickers) {
      const n = shares.get(tk) ?? 0
      if (n > 1e-9) value += n * (await getPriceOn(tk, date))
    }
    const spyValue = spyShares * (await getBenchmarkPriceOn(date))

    // 3) TWR: encadena el retorno del día neutralizando el flujo.
    const base = prevValue + dayFlow
    if (base > 1e-9) twr *= value / base
    prevValue = value

    points.push({ date, value: round2(value), invested: round2(invested), spyValue: round2(spyValue) })
  }

  const last = points[points.length - 1]
  const totalBought = txs.filter((t) => t.type === 'compra').reduce((s, t) => s + t.price * t.shares + t.fees, 0)
  const totalSold = txs.filter((t) => t.type === 'venta').reduce((s, t) => s + t.price * t.shares - t.fees, 0)
  const simpleReturn = totalBought > 0 ? (last.value + totalSold - totalBought) / totalBought : 0
  const spyReturn = totalBought > 0 ? (last.spyValue + totalSold - totalBought) / totalBought : 0

  // XIRR con flujos reales + valor final.
  const flows = txs.map((t) => ({
    date: t.date,
    amount: t.type === 'compra' ? -(t.price * t.shares + t.fees) : t.price * t.shares - t.fees,
  }))
  flows.push({ date: endDate, amount: last.value })
  const days = points.length
  const rate = days >= 30 ? xirr(flows) : null

  // P/L total por ticker (realizado + latente) para win rate y mejores/peores.
  const outcomes: PositionOutcome[] = []
  for (const tk of tickers) {
    const n = shares.get(tk) ?? 0
    const latent = n > 1e-9 ? n * (await getPriceOn(tk, endDate)) - (costBasis.get(tk) ?? 0) : 0
    outcomes.push({ ticker: tk, pl: round2(latent + (realized.get(tk) ?? 0)) })
  }
  const sortedOutcomes = outcomes.toSorted((a, b) => b.pl - a.pl)
  const winRate =
    sortedOutcomes.length > 0 ? sortedOutcomes.filter((o) => o.pl > 0).length / sortedOutcomes.length : null

  return {
    points,
    days,
    simpleReturn,
    twr: twr - 1,
    xirr: rate,
    spyReturn,
    nOperations: txs.length,
    winRate,
    outcomes: sortedOutcomes,
  }
}

function round2(x: number): number {
  return Math.round(x * 100) / 100
}
