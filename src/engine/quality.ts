// Capa 1 — Calidad: filtros duros + score ponderado 0-100.
import type { AnnualFundamentals, Fundamentals, QualityResult } from '../types.ts'

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0
}

function epsCagr(annual: AnnualFundamentals[]): number {
  const first = annual[0].eps
  const last = annual[annual.length - 1].eps
  if (first <= 0 || last <= 0) return -1
  return Math.pow(last / first, 1 / (annual.length - 1)) - 1
}

export function evaluateQuality(f: Fundamentals): QualityResult {
  const a = f.annual
  const latest = a[a.length - 1]

  const avgRoe = avg(a.map((x) => x.roe))
  const avgRoic = avg(a.map((x) => x.roic))
  const avgOpMargin = avg(a.map((x) => x.operatingMargin))
  const fcfPositiveYears = a.filter((x) => x.fcfPerShare > 0).length
  const lossYears = a.filter((x) => x.eps < 0).length
  const debtToEbitda = latest.ebitda > 0 ? latest.debt / latest.ebitda : 99
  const debtToEquity = latest.equity > 0 ? latest.debt / latest.equity : 99
  const currentRatio = latest.currentLiabilities > 0 ? latest.currentAssets / latest.currentLiabilities : 0
  const interestCoverage = latest.interestExpense > 0 ? latest.ebit / latest.interestExpense : 99
  const bpaCagr = epsCagr(a)

  // --- Filtros duros ---
  const failedFilters: string[] = []
  if (avgRoe <= 12) failedFilters.push('ROE medio 10a ≤ 12%')
  if (debtToEbitda >= 3 && debtToEquity >= 1) failedFilters.push('Deuda/EBITDA ≥ 3 y Deuda/Patrimonio ≥ 1')
  if (fcfPositiveYears < 8) failedFilters.push('FCF positivo en < 8 de 10 años')
  if (lossYears > 1 || bpaCagr <= -0.01) failedFilters.push('BPA inestable (pérdidas o CAGR ≤ −1%)')
  if (avgOpMargin <= 0) failedFilters.push('Margen operativo medio ≤ 0')

  const passesHardFilter = failedFilters.length === 0

  // --- Score ponderado ---
  // ROIC 30%
  const roicScore = clamp01((avgRoic - 5) / 20) * 100 // 5%→0, 25%→100
  // Consistencia + crecimiento BPA 20%
  const growthScore = clamp01((bpaCagr + 0.02) / 0.15) * 100 // -2%→0, 13%→100
  const consistency = clamp01(1 - lossYears / 3) * 100
  const bpaScore = 0.6 * growthScore + 0.4 * consistency
  // Salud del balance 20% (deuda/EBITDA, current ratio, cobertura de intereses)
  const debtScore = clamp01((3.5 - debtToEbitda) / 3.5) * 100
  const crScore = clamp01((currentRatio - 0.8) / 1.2) * 100
  const coverageScore = clamp01(interestCoverage / 12) * 100
  const balanceScore = 0.45 * debtScore + 0.3 * crScore + 0.25 * coverageScore
  // Márgenes y su estabilidad 15%
  const marginLevel = clamp01(avgOpMargin / 30) * 100
  const marginStdev = stdev(a.map((x) => x.operatingMargin))
  const marginStability = clamp01(1 - marginStdev / 12) * 100
  const marginScore = 0.6 * marginLevel + 0.4 * marginStability
  // Conversión de FCF 15%
  const fcfConv = avg(
    a.map((x) => {
      const ni = x.eps
      return ni > 0 ? x.fcfPerShare / ni : 0
    }),
  )
  const fcfScore = clamp01(fcfConv / 1.1) * 100

  const score = clampScore(
    0.3 * roicScore +
      0.2 * bpaScore +
      0.2 * balanceScore +
      0.15 * marginScore +
      0.15 * fcfScore,
  )

  return {
    score: Math.round(score),
    passesHardFilter,
    failedFilters,
    avgRoic: round2(avgRoic),
    avgRoe: round2(avgRoe),
    debtToEbitda: round2(debtToEbitda),
  }
}

function stdev(xs: number[]): number {
  const m = avg(xs)
  return Math.sqrt(avg(xs.map((x) => (x - m) ** 2)))
}
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}
function clampScore(x: number): number {
  return Math.max(0, Math.min(100, x))
}
function round2(x: number): number {
  return Math.round(x * 100) / 100
}
