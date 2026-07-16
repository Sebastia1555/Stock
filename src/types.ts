// Modelo de datos central de Buffett Daily.
// Sin enums (erasableSyntaxOnly): usamos uniones y objetos `as const`.

export type Conviction = 'alta' | 'media' | 'baja'

export type QualityTier = 'high' | 'mid' | 'low' | 'trap'

/** Serie anual de fundamentales (los índices 0..9 son de más antiguo a más reciente). */
export interface AnnualFundamentals {
  year: number
  revenue: number
  netIncome: number
  eps: number
  fcfPerShare: number
  roe: number // %
  roic: number // %
  debt: number
  equity: number
  ebit: number
  ebitda: number
  operatingMargin: number // %
  bookValuePerShare: number
  sharesOutstanding: number
  interestExpense: number
  currentAssets: number
  currentLiabilities: number
}

export interface Fundamentals {
  ticker: string
  name: string
  sector: string
  price: number
  annual: AnnualFundamentals[] // 10 años
}

export interface Quote {
  ticker: string
  price: number
  changePct: number
  high52: number
  low52: number
  volume: number
}

export interface PricePoint {
  date: string // ISO
  close: number
}

export interface Constituent {
  ticker: string
  name: string
  sector: string
}

export type PriceRange = '1m' | '6m' | '1y' | '5y'

// --- Salida del motor ---

export interface QualityResult {
  score: number // 0-100
  passesHardFilter: boolean
  failedFilters: string[]
  avgRoic: number
  avgRoe: number
  debtToEbitda: number
}

export interface ValuationResult {
  score: number // 0-100
  intrinsicValue: number
  marginOfSafety: number // fracción (0.25 = 25%)
  grahamNumber: number
  peCurrent: number
  peAvg10: number
  earningsYield: number // EBIT/EV
}

export interface TimingResult {
  score: number // 0-100
  drawdownFrom52wHigh: number // fracción negativa/positiva
  priceVsMa200: number // fracción
  rsi: number
  valueTrap: boolean
}

export interface Recommendation {
  date: string
  ticker: string
  name: string
  sector: string
  price: number
  quality: QualityResult
  valuation: ValuationResult
  timing: TimingResult
  totalScore: number // 0-100
  conviction: Conviction
  eligible: boolean
  intrinsicValue: number
  marginOfSafety: number
  drawdown: number
  thesis: string
}

export interface MarketVerdict {
  date: string
  analyzed: number
  passQuality: number
  eligible: number
  primary: Recommendation | null
  alternatives: Recommendation[]
  watchlist: Recommendation[]
}

// --- Fases posteriores (cartera / track record) ---

export type TransactionType = 'compra' | 'venta'

export interface Transaction {
  id: string
  ticker: string
  date: string
  type: TransactionType
  price: number
  shares: number
  fees: number
  thesis: string
}

export interface Position {
  ticker: string
  shares: number
  avgCost: number
  currentValue: number
  pl: number
  plPct: number
  weight: number
}

export interface PortfolioSnapshot {
  date: string
  totalValue: number
  invested: number
  pl: number
  cumulativeReturn: number
}
