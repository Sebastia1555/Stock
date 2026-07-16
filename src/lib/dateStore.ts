// Fecha de mercado compartida entre pantallas (Home, Cartera…).
// Un cambio de fecha revaloriza toda la app: recomendación y posiciones.
import { useSyncExternalStore } from 'react'
import { getMarketDate, setMarketDate } from '../data/provider.ts'

const listeners = new Set<() => void>()

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function setAppDate(date: string): void {
  if (!date || date === getMarketDate()) return
  setMarketDate(date)
  listeners.forEach((l) => l())
}

export function useAppDate(): string {
  return useSyncExternalStore(subscribe, getMarketDate)
}
