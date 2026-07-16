// Ensambla los datos del provider con los indicadores y ejecuta el motor de scoring.
import type { MarketVerdict } from '../types.ts'
import {
  getFundamentals,
  getPriceHistory,
  getQuote,
  getSP500Constituents,
} from '../data/provider.ts'
import { movingAverage, rsi } from './indicators.ts'
import { buildVerdict, type StockInput } from '../engine/scoring.ts'

/** Obtiene el veredicto de mercado completo para la fecha activa del provider. */
export async function getDailyVerdict(date: string): Promise<MarketVerdict> {
  const constituents = await getSP500Constituents()

  const inputs: StockInput[] = await Promise.all(
    constituents.map(async (c) => {
      const [fundamentals, quote, history] = await Promise.all([
        getFundamentals(c.ticker),
        getQuote(c.ticker),
        getPriceHistory(c.ticker, '1y'),
      ])
      return {
        fundamentals,
        quote,
        ma200: movingAverage(history, 200),
        rsi: rsi(history, 14),
      }
    }),
  )

  return buildVerdict(inputs, date)
}
