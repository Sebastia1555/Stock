// Universo mock determinista (~24 valores) para Fase 1.
// PRNG sembrado por ticker (mulberry32) → fundamentales, cotización e historial reproducibles.
import type {
  AnnualFundamentals,
  Constituent,
  Fundamentals,
  PricePoint,
  Quote,
} from '../types.ts'
import { seededRng } from '../engine/prng.ts'
import { conservativeGrowth, dcfIntrinsicValue } from '../engine/valuation.ts'

export type ProfileTier = 'high' | 'mid' | 'low' | 'trap'

interface Profile {
  ticker: string
  name: string
  sector: string
  tier: ProfileTier
  eps: number // BPA más reciente
  epsCagr: number // crecimiento anual del BPA
  roic: number // %
  roe: number // %
  opMargin: number // %
  fcfConv: number // FCF / beneficio neto
  debtToEbitda: number
  currentRatio: number
  shares: number // millones
  mosTarget: number // margen de seguridad objetivo a precio base (negativo = caro)
  drawdownTarget: number // caída objetivo desde el máximo de 52s (negativo)
  negEpsYears?: number[] // índices 0-9 con BPA negativo
  negFcfYears?: number[] // índices 0-9 con FCF negativo
}

const YEARS = 10
const CURRENT_YEAR = 2025

const PROFILES: Profile[] = [
  // --- Calidad cara → watchlist ---
  { ticker: 'AAPL', name: 'Apple', sector: 'Tecnología', tier: 'high', eps: 6.5, epsCagr: 0.09, roic: 45, roe: 45, opMargin: 30, fcfConv: 1.05, debtToEbitda: 1.2, currentRatio: 1.0, shares: 15000, mosTarget: -0.30, drawdownTarget: -0.07 },
  { ticker: 'MSFT', name: 'Microsoft', sector: 'Tecnología', tier: 'high', eps: 11.5, epsCagr: 0.12, roic: 30, roe: 38, opMargin: 42, fcfConv: 0.95, debtToEbitda: 0.8, currentRatio: 1.7, shares: 7400, mosTarget: -0.28, drawdownTarget: -0.06 },
  { ticker: 'NVDA', name: 'NVIDIA', sector: 'Semiconductores', tier: 'high', eps: 2.9, epsCagr: 0.35, roic: 60, roe: 70, opMargin: 55, fcfConv: 0.9, debtToEbitda: 0.3, currentRatio: 3.5, shares: 24000, mosTarget: -0.45, drawdownTarget: -0.05 },
  { ticker: 'COST', name: 'Costco', sector: 'Consumo básico', tier: 'high', eps: 15, epsCagr: 0.11, roic: 22, roe: 28, opMargin: 3.6, fcfConv: 0.8, debtToEbitda: 0.6, currentRatio: 1.0, shares: 443, mosTarget: -0.25, drawdownTarget: -0.05 },
  { ticker: 'V', name: 'Visa', sector: 'Finanzas', tier: 'high', eps: 9.5, epsCagr: 0.13, roic: 28, roe: 45, opMargin: 66, fcfConv: 1.0, debtToEbitda: 0.5, currentRatio: 1.4, shares: 2000, mosTarget: -0.30, drawdownTarget: -0.06 },
  { ticker: 'LLY', name: 'Eli Lilly', sector: 'Salud', tier: 'high', eps: 12, epsCagr: 0.20, roic: 30, roe: 55, opMargin: 35, fcfConv: 0.7, debtToEbitda: 1.5, currentRatio: 1.1, shares: 900, mosTarget: -0.40, drawdownTarget: -0.08 },
  { ticker: 'GOOGL', name: 'Alphabet', sector: 'Tecnología', tier: 'high', eps: 7.5, epsCagr: 0.16, roic: 28, roe: 30, opMargin: 30, fcfConv: 0.9, debtToEbitda: 0.1, currentRatio: 2.1, shares: 12300, mosTarget: -0.22, drawdownTarget: -0.07 },
  { ticker: 'HD', name: 'Home Depot', sector: 'Consumo discrecional', tier: 'high', eps: 15, epsCagr: 0.10, roic: 40, roe: 45, opMargin: 15, fcfConv: 0.9, debtToEbitda: 1.8, currentRatio: 1.2, shares: 995, mosTarget: -0.20, drawdownTarget: -0.09 },
  { ticker: 'MA', name: 'Mastercard', sector: 'Finanzas', tier: 'high', eps: 12, epsCagr: 0.16, roic: 55, roe: 60, opMargin: 57, fcfConv: 1.0, debtToEbitda: 1.0, currentRatio: 1.3, shares: 930, mosTarget: -0.35, drawdownTarget: -0.05 },
  { ticker: 'KO', name: 'Coca-Cola', sector: 'Consumo básico', tier: 'high', eps: 2.6, epsCagr: 0.05, roic: 20, roe: 40, opMargin: 30, fcfConv: 0.9, debtToEbitda: 2.5, currentRatio: 1.1, shares: 4300, mosTarget: -0.15, drawdownTarget: -0.06 },
  { ticker: 'UNH', name: 'UnitedHealth', sector: 'Salud', tier: 'high', eps: 25, epsCagr: 0.13, roic: 20, roe: 25, opMargin: 8, fcfConv: 0.95, debtToEbitda: 1.5, currentRatio: 0.8, shares: 920, mosTarget: -0.10, drawdownTarget: -0.12 },

  // --- Calidad barata → candidatos elegibles ---
  { ticker: 'BMY', name: 'Bristol Myers Squibb', sector: 'Salud', tier: 'mid', eps: 7.5, epsCagr: 0.04, roic: 18, roe: 22, opMargin: 25, fcfConv: 1.1, debtToEbitda: 2.2, currentRatio: 1.3, shares: 2030, mosTarget: 0.35, drawdownTarget: -0.30 },
  { ticker: 'PFE', name: 'Pfizer', sector: 'Salud', tier: 'mid', eps: 3.2, epsCagr: 0.03, roic: 14, roe: 18, opMargin: 22, fcfConv: 0.9, debtToEbitda: 2.6, currentRatio: 1.2, shares: 5700, mosTarget: 0.32, drawdownTarget: -0.28 },
  { ticker: 'CMCSA', name: 'Comcast', sector: 'Comunicaciones', tier: 'mid', eps: 4.2, epsCagr: 0.06, roic: 13, roe: 18, opMargin: 19, fcfConv: 1.0, debtToEbitda: 2.6, currentRatio: 0.9, shares: 3900, mosTarget: 0.31, drawdownTarget: -0.26 },
  { ticker: 'TGT', name: 'Target', sector: 'Consumo discrecional', tier: 'mid', eps: 9.5, epsCagr: 0.05, roic: 16, roe: 30, opMargin: 6, fcfConv: 0.8, debtToEbitda: 1.8, currentRatio: 0.9, shares: 460, mosTarget: 0.34, drawdownTarget: -0.31 },
  { ticker: 'GILD', name: 'Gilead Sciences', sector: 'Salud', tier: 'mid', eps: 6.8, epsCagr: 0.02, roic: 20, roe: 25, opMargin: 40, fcfConv: 1.1, debtToEbitda: 1.5, currentRatio: 1.4, shares: 1250, mosTarget: 0.33, drawdownTarget: -0.24 },
  { ticker: 'CSCO', name: 'Cisco', sector: 'Tecnología', tier: 'high', eps: 3.3, epsCagr: 0.05, roic: 22, roe: 28, opMargin: 27, fcfConv: 1.05, debtToEbitda: 1.2, currentRatio: 1.4, shares: 4050, mosTarget: 0.29, drawdownTarget: -0.22 },
  { ticker: 'VZ', name: 'Verizon', sector: 'Comunicaciones', tier: 'mid', eps: 4.5, epsCagr: 0.01, roic: 12, roe: 20, opMargin: 22, fcfConv: 0.8, debtToEbitda: 2.9, currentRatio: 0.8, shares: 4200, mosTarget: 0.32, drawdownTarget: -0.25 },
  { ticker: 'MMM', name: '3M', sector: 'Industrial', tier: 'mid', eps: 9, epsCagr: 0.02, roic: 18, roe: 40, opMargin: 20, fcfConv: 1.0, debtToEbitda: 2.2, currentRatio: 1.1, shares: 550, mosTarget: 0.3, drawdownTarget: -0.29 },

  // --- Baja calidad → fallan filtros duros ---
  { ticker: 'F', name: 'Ford', sector: 'Automóvil', tier: 'low', eps: 1.6, epsCagr: 0.01, roic: 4, roe: 8, opMargin: 3, fcfConv: 0.5, debtToEbitda: 6, currentRatio: 1.2, shares: 4000, mosTarget: 0.20, drawdownTarget: -0.30 },
  { ticker: 'T', name: 'AT&T', sector: 'Comunicaciones', tier: 'low', eps: 2.4, epsCagr: -0.02, roic: 6, roe: 10, opMargin: 18, fcfConv: 0.9, debtToEbitda: 3.4, currentRatio: 0.7, shares: 7150, mosTarget: 0.22, drawdownTarget: -0.28 },
  { ticker: 'CCL', name: 'Carnival', sector: 'Ocio', tier: 'low', eps: 1.5, epsCagr: 0.02, roic: 5, roe: 14, opMargin: 8, fcfConv: 0.6, debtToEbitda: 5, currentRatio: 0.4, shares: 1250, mosTarget: 0.25, drawdownTarget: -0.40, negEpsYears: [3, 4, 5], negFcfYears: [3, 4, 5, 6] },
  { ticker: 'WBD', name: 'Warner Bros. Discovery', sector: 'Comunicaciones', tier: 'low', eps: -0.8, epsCagr: 0.0, roic: 3, roe: 5, opMargin: 6, fcfConv: 0.7, debtToEbitda: 4.5, currentRatio: 0.8, shares: 2450, mosTarget: 0.25, drawdownTarget: -0.35, negEpsYears: [7, 8, 9] },

  // --- Value trap → barata pero deteriorada ---
  { ticker: 'INTC', name: 'Intel', sector: 'Semiconductores', tier: 'trap', eps: 2.0, epsCagr: 0.03, roic: 14, roe: 16, opMargin: 20, fcfConv: 0.8, debtToEbitda: 2.5, currentRatio: 1.5, shares: 4200, mosTarget: 0.45, drawdownTarget: -0.45, negFcfYears: [9] },
]

// --- Generación de fundamentales (cacheada por ticker) ---

const fundamentalsCache = new Map<string, Fundamentals>()
const basePriceCache = new Map<string, number>()

function noise(rng: () => number, amp: number): number {
  return 1 + (rng() - 0.5) * 2 * amp
}

function buildAnnual(p: Profile): AnnualFundamentals[] {
  const out: AnnualFundamentals[] = []
  for (let i = 0; i < YEARS; i++) {
    const rng = seededRng(`${p.ticker}:${i}`)
    const yearsBack = YEARS - 1 - i
    let eps = p.eps / Math.pow(1 + p.epsCagr, yearsBack)
    eps *= noise(rng, 0.04)
    if (p.negEpsYears?.includes(i)) eps = -Math.abs(eps) * (0.5 + rng())

    let fcfPerShare = eps * p.fcfConv * noise(rng, 0.06)
    if (p.negFcfYears?.includes(i)) fcfPerShare = -Math.abs(p.eps) * (0.2 + rng() * 0.4)

    const shares = p.shares
    const netIncome = eps * shares
    const netMargin = (p.opMargin * 0.72) / 100
    const revenue = netMargin > 0 ? Math.abs(netIncome) / Math.max(0.01, netMargin) : Math.abs(netIncome) * 20
    const opMargin = p.opMargin * noise(rng, 0.08)
    const ebit = (revenue * opMargin) / 100
    const ebitda = ebit * 1.25
    const debt = Math.max(0, p.debtToEbitda * Math.max(1, ebitda))
    const roe = p.roe * noise(rng, 0.06)
    const roic = p.roic * noise(rng, 0.06)
    const equity = roe > 0 ? netIncome / (roe / 100) : revenue * 0.3
    const bookValuePerShare = Math.abs(equity) / shares
    const interestExpense = debt * 0.045
    const currentLiabilities = revenue * 0.16
    const currentAssets = currentLiabilities * p.currentRatio

    out.push({
      year: CURRENT_YEAR - (YEARS - 1) + i,
      revenue: round2(revenue),
      netIncome: round2(netIncome),
      eps: round2(eps),
      fcfPerShare: round2(fcfPerShare),
      roe: round2(roe),
      roic: round2(roic),
      debt: round2(debt),
      equity: round2(equity),
      ebit: round2(ebit),
      ebitda: round2(ebitda),
      operatingMargin: round2(opMargin),
      bookValuePerShare: round2(bookValuePerShare),
      sharesOutstanding: shares,
      interestExpense: round2(interestExpense),
      currentAssets: round2(currentAssets),
      currentLiabilities: round2(currentLiabilities),
    })
  }
  return out
}

function getProfile(ticker: string): Profile {
  const p = PROFILES.find((x) => x.ticker === ticker)
  if (!p) throw new Error(`Ticker desconocido: ${ticker}`)
  return p
}

function baseFundamentals(ticker: string): Fundamentals {
  const cached = fundamentalsCache.get(ticker)
  if (cached) return cached
  const p = getProfile(ticker)
  const f: Fundamentals = {
    ticker: p.ticker,
    name: p.name,
    sector: p.sector,
    price: 0, // se rellena en getFundamentals con la deriva del día
    annual: buildAnnual(p),
  }
  fundamentalsCache.set(ticker, f)
  return f
}

function basePrice(ticker: string): number {
  const cached = basePriceCache.get(ticker)
  if (cached !== undefined) return cached
  const p = getProfile(ticker)
  const f = baseFundamentals(ticker)
  const latest = f.annual[f.annual.length - 1]
  const growth = conservativeGrowth(f)
  const iv = dcfIntrinsicValue(latest.fcfPerShare, growth)
  const price = iv > 0 ? iv * (1 - p.mosTarget) : Math.max(5, Math.abs(latest.eps) * 11)
  basePriceCache.set(ticker, round2(price))
  return round2(price)
}

// --- Deriva de mercado determinista por fecha ---

/** factor = 1 + ruido_mercado(±20%, semilla=fecha) + ruido_idiosincrático(±5%, semilla=fecha+ticker). */
export function applyDailyDrift(base: number, ticker: string, date: string): number {
  const market = (seededRng(`mkt:${date}`)() - 0.5) * 2 * 0.2
  const idio = (seededRng(`idio:${date}:${ticker}`)() - 0.5) * 2 * 0.05
  const factor = Math.max(0.5, 1 + market + idio)
  return round2(base * factor)
}

function currentPrice(ticker: string, date: string): number {
  return applyDailyDrift(basePrice(ticker), ticker, date)
}

// --- Historial de precios coherente con la cotización ---

function buildPriceHistory(ticker: string, date: string, days: number): PricePoint[] {
  const p = getProfile(ticker)
  const price = currentPrice(ticker, date)
  const peak = price / (1 + p.drawdownTarget) // drawdownTarget negativo → peak > price
  const rng = seededRng(`hist:${ticker}:${date}`)
  const points: PricePoint[] = []
  const peakPos = Math.floor(days * 0.62)
  const end = new Date(date + 'T00:00:00Z')
  for (let i = 0; i < days; i++) {
    let level: number
    if (i <= peakPos) {
      const t = peakPos === 0 ? 1 : i / peakPos
      level = peak * (0.82 + 0.18 * t)
    } else {
      const t = (i - peakPos) / (days - 1 - peakPos)
      level = peak + (price - peak) * t
    }
    level *= noise(rng, 0.02)
    const d = new Date(end)
    d.setUTCDate(d.getUTCDate() - (days - 1 - i))
    points.push({ date: d.toISOString().slice(0, 10), close: round2(Math.max(0.5, level)) })
  }
  // Fija el último punto exactamente en el precio actual.
  points[points.length - 1] = { date: points[points.length - 1].date, close: price }
  return points
}

// --- API pública del mock (consumida por provider.ts) ---

export function mockConstituents(): Constituent[] {
  return PROFILES.map((p) => ({ ticker: p.ticker, name: p.name, sector: p.sector }))
}

export function mockFundamentals(ticker: string, date: string): Fundamentals {
  const base = baseFundamentals(ticker)
  return { ...base, price: currentPrice(ticker, date) }
}

export function mockQuote(ticker: string, date: string): Quote {
  const history = buildPriceHistory(ticker, date, 252)
  const closes = history.map((h) => h.close)
  const price = closes[closes.length - 1]
  const prev = closes[closes.length - 2] ?? price
  const high52 = Math.max(...closes)
  const low52 = Math.min(...closes)
  return {
    ticker,
    price,
    changePct: round2(((price - prev) / prev) * 100),
    high52: round2(high52),
    low52: round2(low52),
    volume: Math.round(2_000_000 + seededRng(`vol:${ticker}:${date}`)() * 40_000_000),
  }
}

export function mockPriceHistory(ticker: string, date: string, days: number): PricePoint[] {
  return buildPriceHistory(ticker, date, days)
}

/** Serie del índice de referencia (SPY) para el track record (fases posteriores). */
export function mockBenchmark(date: string, days: number): PricePoint[] {
  const rng = seededRng(`spy:${date}`)
  const end = new Date(date + 'T00:00:00Z')
  const points: PricePoint[] = []
  let level = 400
  for (let i = 0; i < days; i++) {
    level *= 1 + (rng() - 0.48) * 0.012
    const d = new Date(end)
    d.setUTCDate(d.getUTCDate() - (days - 1 - i))
    points.push({ date: d.toISOString().slice(0, 10), close: round2(level) })
  }
  return points
}

function round2(x: number): number {
  return Math.round(x * 100) / 100
}
