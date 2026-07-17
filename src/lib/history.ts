// Historial de recomendaciones del motor: como los picks son deterministas por fecha,
// se reconstruyen sin almacenamiento y se mide su evolución hasta hoy (hit rate).
import type { Conviction } from '../types.ts'
import { getBenchmarkPriceOn, getPriceOn } from '../data/provider.ts'
import { getDailyVerdict } from './recommendations.ts'

export interface PastPick {
  date: string
  ticker: string
  name: string
  conviction: Conviction
  priceThen: number
  priceNow: number
  pickReturn: number // rentabilidad del pick desde su fecha
  vsSpy: number // diferencia vs SPY en el mismo periodo (puntos)
  marginOfSafety: number
}

export interface EngineHistory {
  picks: PastPick[] // de más reciente a más antiguo
  daysScanned: number
  noBuyDays: number
  hitRateVsSpy: number | null // % de picks que baten al índice en su periodo
  positiveRate: number | null // % de picks con rentabilidad absoluta > 0
  avgReturn: number | null
  avgVsSpy: number | null
}

function isoDaysAgo(endDate: string, n: number): string {
  const d = new Date(endDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Reconstruye los picks principales de los últimos `days` días (sin incluir hoy). */
export async function buildEngineHistory(endDate: string, days = 45): Promise<EngineHistory> {
  const picks: PastPick[] = []
  let noBuyDays = 0
  const spyNow = await getBenchmarkPriceOn(endDate)

  // n = 1 es ayer; se recorre de reciente a antiguo para listar newest-first.
  for (let n = 1; n <= days; n++) {
    const date = isoDaysAgo(endDate, n)
    const verdict = await getDailyVerdict(date)
    if (!verdict.primary) {
      noBuyDays++
      continue
    }
    const p = verdict.primary
    const priceNow = await getPriceOn(p.ticker, endDate)
    const spyThen = await getBenchmarkPriceOn(date)
    const ret = (priceNow - p.price) / p.price
    const spyRet = (spyNow - spyThen) / spyThen
    picks.push({
      date,
      ticker: p.ticker,
      name: p.name,
      conviction: p.conviction,
      priceThen: p.price,
      priceNow,
      pickReturn: ret,
      vsSpy: ret - spyRet,
      marginOfSafety: p.marginOfSafety,
    })
  }

  const n = picks.length
  const hitRateVsSpy = n > 0 ? picks.filter((p) => p.vsSpy > 0).length / n : null
  const positiveRate = n > 0 ? picks.filter((p) => p.pickReturn > 0).length / n : null
  const avgReturn = n > 0 ? picks.reduce((s, p) => s + p.pickReturn, 0) / n : null
  const avgVsSpy = n > 0 ? picks.reduce((s, p) => s + p.vsSpy, 0) / n : null

  return { picks, daysScanned: days, noBuyDays, hitRateVsSpy, positiveRate, avgReturn, avgVsSpy }
}
