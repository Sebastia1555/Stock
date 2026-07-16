// Deriva la cartera (posiciones valoradas) a partir del registro de operaciones.
// Método de coste medio: las compras suman coste (precio×acciones + comisiones);
// las ventas realizan P/L contra el coste medio y reducen la base.
import type { Position, Recommendation, Transaction } from '../types.ts'
import { getQuote } from '../data/provider.ts'
import { analyzeTicker } from './recommendations.ts'

export interface PositionView extends Position {
  name: string
  sector: string
  price: number
  costBasis: number
  /** Guardarraíl: la posición ha perdido su tesis (falla calidad o es value trap). */
  thesisAtRisk: boolean
  analysis: Recommendation
}

export interface PortfolioSummary {
  positions: PositionView[]
  invested: number // coste base de las posiciones abiertas
  value: number
  pl: number
  plPct: number
  realized: number // P/L realizado por ventas (neto de comisiones)
}

interface Acc {
  shares: number
  cost: number
  realized: number
}

function accumulate(transactions: Transaction[]): Map<string, Acc> {
  const accs = new Map<string, Acc>()
  for (const t of transactions) {
    const a = accs.get(t.ticker) ?? { shares: 0, cost: 0, realized: 0 }
    if (t.type === 'compra') {
      a.shares += t.shares
      a.cost += t.price * t.shares + t.fees
    } else {
      const avg = a.shares > 0 ? a.cost / a.shares : 0
      const sold = Math.min(t.shares, a.shares)
      a.realized += (t.price - avg) * sold - t.fees
      a.cost -= avg * sold
      a.shares -= sold
    }
    accs.set(t.ticker, a)
  }
  return accs
}

/**
 * Acciones en cartera de un ticker EN UNA FECHA dada (para validar ventas:
 * no se puede vender lo que aún no se había comprado). `excludeId` omite la operación en edición.
 */
export function heldSharesAt(
  transactions: Transaction[],
  ticker: string,
  date: string,
  excludeId?: string,
): number {
  const relevant = transactions
    .filter((t) => t.ticker === ticker && t.id !== excludeId && t.date <= date)
    .toSorted((a, b) => a.date.localeCompare(b.date))
  return accumulate(relevant).get(ticker)?.shares ?? 0
}

export async function buildPortfolio(
  transactions: Transaction[],
  date: string,
): Promise<PortfolioSummary> {
  const accs = accumulate(transactions)
  const open = [...accs.entries()].filter(([, a]) => a.shares > 1e-9)

  const positions: PositionView[] = await Promise.all(
    open.map(async ([ticker, a]) => {
      const [quote, analysis] = await Promise.all([getQuote(ticker), analyzeTicker(ticker, date)])
      const value = quote.price * a.shares
      const pl = value - a.cost
      return {
        ticker,
        name: analysis.name,
        sector: analysis.sector,
        shares: a.shares,
        avgCost: a.shares > 0 ? a.cost / a.shares : 0,
        price: quote.price,
        costBasis: a.cost,
        currentValue: value,
        pl,
        plPct: a.cost > 0 ? pl / a.cost : 0,
        weight: 0, // se rellena tras conocer el total
        thesisAtRisk: !analysis.quality.passesHardFilter || analysis.timing.valueTrap,
        analysis,
      }
    }),
  )

  const value = positions.reduce((s, p) => s + p.currentValue, 0)
  const invested = positions.reduce((s, p) => s + p.costBasis, 0)
  for (const p of positions) p.weight = value > 0 ? p.currentValue / value : 0

  const realized = [...accs.values()].reduce((s, a) => s + a.realized, 0)
  const pl = value - invested

  return {
    positions: positions.toSorted((a, b) => b.currentValue - a.currentValue),
    invested,
    value,
    pl,
    plPct: invested > 0 ? pl / invested : 0,
    realized,
  }
}
