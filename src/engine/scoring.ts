// Orquestador del motor: combina las 3 capas → Recommendation y MarketVerdict.
import type {
  Conviction,
  Fundamentals,
  MarketVerdict,
  Quote,
  Recommendation,
} from '../types.ts'
import { evaluateQuality } from './quality.ts'
import { evaluateValuation, MIN_MARGIN_OF_SAFETY } from './valuation.ts'
import { evaluateTiming } from './timing.ts'

export interface StockInput {
  fundamentals: Fundamentals
  quote: Quote
  ma200: number
  rsi: number
}

const WEIGHT_QUALITY = 0.45
const WEIGHT_VALUATION = 0.4
const WEIGHT_TIMING = 0.15

function decideConviction(total: number, mos: number, eligible: boolean): Conviction {
  if (!eligible) return 'baja'
  if (total >= 72 && mos >= 0.35) return 'alta'
  if (total >= 58 && mos >= MIN_MARGIN_OF_SAFETY) return 'media'
  return 'baja'
}

function pct(x: number): string {
  return `${(x * 100).toFixed(0)}%`
}

function buildThesis(
  f: Fundamentals,
  q: { avgRoic: number; debtToEbitda: number },
  v: { marginOfSafety: number; intrinsicValue: number },
  drawdown: number,
  eligible: boolean,
  passesQuality: boolean,
  valueTrap: boolean,
): string {
  const balance = q.debtToEbitda < 1.5 ? 'balance muy sólido' : q.debtToEbitda < 3 ? 'balance saneado' : 'balance apalancado'
  const qualityPhrase = `${f.name} rinde un ROIC medio del ${q.avgRoic.toFixed(0)}% con ${balance}`

  if (!passesQuality) {
    return `${f.name} no supera el filtro de calidad Buffett/Graham, así que queda descartada como compra por barata que parezca.`
  }
  if (valueTrap) {
    return `${qualityPhrase}, pero la fuerte caída viene acompañada de deterioro del negocio: posible value trap, descartada.`
  }
  if (eligible) {
    return `${qualityPhrase}. Cotiza con un margen de seguridad del ${pct(v.marginOfSafety)} sobre un valor intrínseco de ${v.intrinsicValue.toFixed(0)} $, tras caer ${pct(Math.abs(drawdown))} desde máximos: negocio excelente a precio razonable.`
  }
  const overpay = v.intrinsicValue > 0 ? (f.price - v.intrinsicValue) / v.intrinsicValue : 0
  return `${qualityPhrase}, un negocio de watchlist. Hoy cotiza ${pct(Math.abs(overpay))} por encima de su valor intrínseco estimado: excelente, pero aún sin margen de seguridad.`
}

export function scoreStock(input: StockInput, date: string): Recommendation {
  const { fundamentals: f, quote, ma200, rsi } = input
  const quality = evaluateQuality(f)
  const valuation = evaluateValuation(f)
  const timing = evaluateTiming(f, quote, ma200, rsi)

  const eligible =
    quality.passesHardFilter &&
    valuation.marginOfSafety >= MIN_MARGIN_OF_SAFETY &&
    !timing.valueTrap

  const totalScore = Math.round(
    WEIGHT_QUALITY * quality.score +
      WEIGHT_VALUATION * valuation.score +
      WEIGHT_TIMING * timing.score,
  )

  const conviction = decideConviction(totalScore, valuation.marginOfSafety, eligible)

  const thesis = buildThesis(
    f,
    quality,
    valuation,
    timing.drawdownFrom52wHigh,
    eligible,
    quality.passesHardFilter,
    timing.valueTrap,
  )

  return {
    date,
    ticker: f.ticker,
    name: f.name,
    sector: f.sector,
    price: f.price,
    quality,
    valuation,
    timing,
    totalScore,
    conviction,
    eligible,
    intrinsicValue: valuation.intrinsicValue,
    marginOfSafety: valuation.marginOfSafety,
    drawdown: timing.drawdownFrom52wHigh,
    thesis,
  }
}

export function buildVerdict(recs: Recommendation[], date: string): MarketVerdict {
  const passQuality = recs.filter((r) => r.quality.passesHardFilter).length
  const eligibleRecs = recs
    .filter((r) => r.eligible)
    .toSorted((a, b) => b.totalScore - a.totalScore)

  // Watchlist: calidad probada pero sin margen de seguridad (y sin value trap).
  const watchlist = recs
    .filter(
      (r) =>
        r.quality.passesHardFilter &&
        !r.eligible &&
        !r.timing.valueTrap &&
        r.marginOfSafety < MIN_MARGIN_OF_SAFETY,
    )
    .toSorted((a, b) => b.quality.score - a.quality.score)

  return {
    date,
    analyzed: recs.length,
    passQuality,
    eligible: eligibleRecs.length,
    primary: eligibleRecs[0] ?? null,
    alternatives: eligibleRecs.slice(1, 4),
    watchlist,
  }
}
