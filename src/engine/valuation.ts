// Capa 2 — Valoración y margen de seguridad.
import type { Fundamentals, ValuationResult } from '../types.ts'

export const DISCOUNT_RATE = 0.095
export const TERMINAL_GROWTH = 0.025
export const MAX_STAGE1_GROWTH = 0.08
export const STAGE1_YEARS = 10
export const BOND_YIELD_10Y = 0.043
export const MIN_MARGIN_OF_SAFETY = 0.25

/** CAGR de una serie (usa primer y último valor positivos). */
export function cagr(series: number[]): number {
  const first = series[0]
  const last = series[series.length - 1]
  if (first <= 0 || last <= 0) return 0
  const years = series.length - 1
  return Math.pow(last / first, 1 / years) - 1
}

/**
 * DCF a dos etapas sobre owner earnings ≈ FCF/acción.
 * Etapa 1: `years` años creciendo a `growth`. Etapa 2: valor terminal (Gordon).
 */
export function dcfIntrinsicValue(
  ownerEarnings: number,
  growth: number,
  discount: number = DISCOUNT_RATE,
  terminal: number = TERMINAL_GROWTH,
  years: number = STAGE1_YEARS,
): number {
  if (ownerEarnings <= 0) return 0
  let pv = 0
  let cf = ownerEarnings
  for (let y = 1; y <= years; y++) {
    cf = cf * (1 + growth)
    pv += cf / Math.pow(1 + discount, y)
  }
  // Valor terminal al final de la etapa 1, descontado a hoy.
  const terminalCf = cf * (1 + terminal)
  const terminalValue = terminalCf / (discount - terminal)
  pv += terminalValue / Math.pow(1 + discount, years)
  return pv
}

/** Crecimiento conservador para el DCF: min(CAGR histórico del FCF, tope). */
export function conservativeGrowth(f: Fundamentals): number {
  const fcf = f.annual.map((a) => a.fcfPerShare)
  const g = cagr(fcf)
  return Math.max(0, Math.min(g, MAX_STAGE1_GROWTH))
}

export function evaluateValuation(f: Fundamentals): ValuationResult {
  const latest = f.annual[f.annual.length - 1]
  const ownerEarnings = latest.fcfPerShare
  const growth = conservativeGrowth(f)
  const intrinsicValue = dcfIntrinsicValue(ownerEarnings, growth)
  const marginOfSafety = intrinsicValue > 0 ? (intrinsicValue - f.price) / intrinsicValue : -1

  // Número de Graham √(22,5 × BPA × valor contable/acción).
  const grahamInput = 22.5 * latest.eps * latest.bookValuePerShare
  const grahamNumber = grahamInput > 0 ? Math.sqrt(grahamInput) : 0

  // P/E actual vs media 10a.
  const peCurrent = latest.eps > 0 ? f.price / latest.eps : 0
  const pes = f.annual.map((a) => {
    // Precio por año aproximado escalando el actual por el BPA relativo.
    const approxPrice = f.price * (a.eps / latest.eps || 1)
    return a.eps > 0 ? approxPrice / a.eps : 0
  })
  const validPes = pes.filter((p) => p > 0)
  const peAvg10 = validPes.length ? validPes.reduce((s, p) => s + p, 0) / validPes.length : 0

  // Earnings yield EBIT/EV.
  const marketCap = f.price * latest.sharesOutstanding
  const netDebt = latest.debt - latest.currentAssets
  const ev = marketCap + Math.max(0, netDebt)
  const earningsYield = ev > 0 ? latest.ebit / ev : 0

  // Score: el margen de seguridad domina (~55%).
  const mosScore = clamp01((marginOfSafety - 0) / 0.5) * 100 // 0%→0, 50%→100
  const grahamScore = grahamNumber > 0 ? clamp01((grahamNumber - f.price) / grahamNumber + 0.3) * 100 : 0
  const peScore = peAvg10 > 0 ? clamp01((peAvg10 - peCurrent) / peAvg10 + 0.4) * 100 : 40
  const yieldScore = clamp01((earningsYield - BOND_YIELD_10Y) / 0.06 + 0.3) * 100

  const score = round(
    0.55 * mosScore + 0.2 * grahamScore + 0.15 * peScore + 0.1 * yieldScore,
  )

  return {
    score: clampScore(score),
    intrinsicValue: round2(intrinsicValue),
    marginOfSafety: round4(marginOfSafety),
    grahamNumber: round2(grahamNumber),
    peCurrent: round2(peCurrent),
    peAvg10: round2(peAvg10),
    earningsYield: round4(earningsYield),
  }
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}
function clampScore(x: number): number {
  return Math.max(0, Math.min(100, x))
}
function round(x: number): number {
  return Math.round(x)
}
function round2(x: number): number {
  return Math.round(x * 100) / 100
}
function round4(x: number): number {
  return Math.round(x * 10000) / 10000
}
