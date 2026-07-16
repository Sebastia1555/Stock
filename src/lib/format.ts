// Utilidades de formato (es-ES).

export function money(n: number, currency = 'USD'): string {
  return n.toLocaleString('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function pct(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`
}

export function signedPct(fraction: number, digits = 1): string {
  const v = (fraction * 100).toFixed(digits)
  return `${fraction >= 0 ? '+' : ''}${v}%`
}

export function num(n: number, digits = 0): string {
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatDateEs(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
