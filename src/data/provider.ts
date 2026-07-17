// Interfaz de datos: la UI y el motor CONSUMEN estas funciones.
// En Fase 1 se respaldan con datos mock deterministas. En fases posteriores
// cada función se cableará a una API real (p. ej. Finnhub) sin tocar UI ni motor.
// Todas aceptan una fecha opcional (por defecto, la fecha de mercado activa),
// lo que permite reconstruir recomendaciones pasadas sin tocar estado global.
import type {
  Constituent,
  Fundamentals,
  PriceRange,
  PricePoint,
  Quote,
} from '../types.ts'
import {
  mockBenchmark,
  mockConstituents,
  mockFundamentals,
  mockPriceHistory,
  mockPriceOn,
  mockQuote,
  mockSpyPriceOn,
} from './mockData.ts'

// Fecha "de mercado" activa. La app puede fijarla (p. ej. para demostrar un día sin compras).
let marketDate = new Date().toISOString().slice(0, 10)

export function setMarketDate(date: string): void {
  marketDate = date
}
export function getMarketDate(): string {
  return marketDate
}

function rangeToDays(range: PriceRange): number {
  switch (range) {
    case '1m':
      return 22
    case '6m':
      return 126
    case '1y':
      return 252
    case '5y':
      return 252 * 5
  }
}

// Simula latencia mínima para mantener la firma async (real en fases futuras).
function resolve<T>(value: T): Promise<T> {
  return Promise.resolve(value)
}

export function getSP500Constituents(): Promise<Constituent[]> {
  return resolve(mockConstituents())
}

export function getFundamentals(ticker: string, date: string = marketDate): Promise<Fundamentals> {
  return resolve(mockFundamentals(ticker, date))
}

export function getQuote(ticker: string, date: string = marketDate): Promise<Quote> {
  return resolve(mockQuote(ticker, date))
}

export function getPriceHistory(
  ticker: string,
  range: PriceRange,
  date: string = marketDate,
): Promise<PricePoint[]> {
  return resolve(mockPriceHistory(ticker, date, rangeToDays(range)))
}

export function getBenchmark(range: PriceRange, date: string = marketDate): Promise<PricePoint[]> {
  return resolve(mockBenchmark(date, rangeToDays(range)))
}

/** Precio de cierre de un ticker en una fecha pasada (valoración histórica de la cartera). */
export function getPriceOn(ticker: string, date: string): Promise<number> {
  return resolve(mockPriceOn(ticker, date))
}

/** Precio del índice de referencia (SPY) en una fecha. */
export function getBenchmarkPriceOn(date: string): Promise<number> {
  return resolve(mockSpyPriceOn(date))
}
