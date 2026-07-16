// Indicadores técnicos derivados del historial de precios.
import type { PricePoint } from '../types.ts'

/** Media móvil de las últimas `period` sesiones. */
export function movingAverage(points: PricePoint[], period: number): number {
  const closes = points.map((p) => p.close)
  const slice = closes.slice(-period)
  if (slice.length === 0) return 0
  return slice.reduce((s, c) => s + c, 0) / slice.length
}

/** RSI de Wilder sobre `period` sesiones (por defecto 14). */
export function rsi(points: PricePoint[], period = 14): number {
  const closes = points.map((p) => p.close)
  if (closes.length <= period) return 50
  let gains = 0
  let losses = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}
