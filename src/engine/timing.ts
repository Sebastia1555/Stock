// Capa 3 — Timing de la caída + detección de value trap.
import type { Fundamentals, Quote, TimingResult } from '../types.ts'

/**
 * Evalúa el timing a partir de la cotización y los fundamentales.
 * @param ma200 media móvil de 200 sesiones (aprox.)
 * @param rsi índice de fuerza relativa (0-100)
 */
export function evaluateTiming(
  f: Fundamentals,
  quote: Quote,
  ma200: number,
  rsi: number,
): TimingResult {
  const drawdown = quote.high52 > 0 ? (quote.price - quote.high52) / quote.high52 : 0 // negativo = por debajo del máximo
  const priceVsMa200 = ma200 > 0 ? (quote.price - ma200) / ma200 : 0

  // Deterioro del negocio: BPA último año cae >20% o FCF último año negativo.
  const a = f.annual
  const last = a[a.length - 1]
  const prev = a[a.length - 2]
  const epsDropPct = prev.eps > 0 ? (last.eps - prev.eps) / prev.eps : (last.eps < 0 ? -1 : 0)
  const deterioration = epsDropPct < -0.2 || last.fcfPerShare < 0
  const bigDrop = drawdown < -0.15
  const valueTrap = bigDrop && deterioration

  // Score base de timing: más caída + sobreventa = mejor punto de entrada.
  const drawdownScore = clamp01(-drawdown / 0.4) * 100 // 0%→0, -40%→100
  const maScore = clamp01((0.05 - priceVsMa200) / 0.25) * 100 // por debajo de la MA200 puntúa más
  const rsiScore = clamp01((70 - rsi) / 45) * 100 // sobreventa (RSI bajo) puntúa más

  let score = 0.5 * drawdownScore + 0.25 * maScore + 0.25 * rsiScore
  if (valueTrap) score *= 0.4 // penaliza value traps

  return {
    score: clampScore(Math.round(score)),
    drawdownFrom52wHigh: round4(drawdown),
    priceVsMa200: round4(priceVsMa200),
    rsi: Math.round(rsi),
    valueTrap,
  }
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}
function clampScore(x: number): number {
  return Math.max(0, Math.min(100, x))
}
function round4(x: number): number {
  return Math.round(x * 10000) / 10000
}
