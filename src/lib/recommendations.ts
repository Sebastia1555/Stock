// Ensambla los datos del provider con los indicadores y ejecuta el motor de scoring.
import type { MarketVerdict, Recommendation } from '../types.ts'
import {
  getFundamentals,
  getPriceHistory,
  getQuote,
  getSP500Constituents,
} from '../data/provider.ts'
import { movingAverage, rsi } from './indicators.ts'
import { buildVerdict, scoreStock } from '../engine/scoring.ts'

/** Analiza un único ticker en una fecha dada (usado por Home, Cartera, Detalle e Historial). */
export async function analyzeTicker(ticker: string, date: string): Promise<Recommendation> {
  const [fundamentals, quote, history] = await Promise.all([
    getFundamentals(ticker, date),
    getQuote(ticker, date),
    getPriceHistory(ticker, '1y', date),
  ])
  return scoreStock(
    { fundamentals, quote, ma200: movingAverage(history, 200), rsi: rsi(history, 14) },
    date,
  )
}

/** Obtiene el veredicto de mercado completo para la fecha activa del provider. */
export async function getDailyVerdict(date: string): Promise<MarketVerdict> {
  const constituents = await getSP500Constituents()
  const recs = await Promise.all(constituents.map((c) => analyzeTicker(c.ticker, date)))
  return buildVerdict(recs, date)
}
