// Los diez KPIs básicos de Warren Buffett con umbral explícito y veredicto ✓/✗.
// Primero calidad del negocio (1-7), después precio (8-10): el orden importa.
import type { Fundamentals, Recommendation } from '../types.ts'
import { BOND_YIELD_10Y, MIN_MARGIN_OF_SAFETY } from '../engine/valuation.ts'

export interface BuffettKpi {
  id: string
  label: string
  value: string // formateado para mostrar
  threshold: string // umbral exigido, legible
  passed: boolean
  hint: string // por qué importa, en una frase
  group: 'negocio' | 'precio'
}

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0
}

function pctFmt(x: number, d = 0): string {
  return `${(x * 100).toFixed(d)}%`
}

export function buildBuffettKpis(f: Fundamentals, rec: Recommendation): BuffettKpi[] {
  const a = f.annual
  const opMargins = a.map((x) => x.operatingMargin)
  const avgMargin = avg(opMargins)
  const marginStdev = Math.sqrt(avg(opMargins.map((m) => (m - avgMargin) ** 2)))
  const marginVariability = avgMargin > 0 ? marginStdev / avgMargin : 1
  const fcfYears = a.filter((x) => x.fcfPerShare > 0).length
  const fcfConv = avg(a.map((x) => (x.eps > 0 ? x.fcfPerShare / x.eps : 0)))
  const first = a[0].eps
  const last = a[a.length - 1].eps
  const epsCagr = first > 0 && last > 0 ? Math.pow(last / first, 1 / (a.length - 1)) - 1 : -1


  return [
    {
      id: 'roe',
      group: 'negocio',
      label: 'ROE medio 10 años',
      value: `${rec.quality.avgRoe.toFixed(0)}%`,
      threshold: '> 12%',
      passed: rec.quality.avgRoe > 12,
      hint: 'Rentabilidad que el negocio saca al dinero de sus accionistas.',
    },
    {
      id: 'roic',
      group: 'negocio',
      label: 'ROIC medio 10 años',
      value: `${rec.quality.avgRoic.toFixed(0)}%`,
      threshold: '≥ 15%',
      passed: rec.quality.avgRoic >= 15,
      hint: 'El indicador del foso: cuánto rinde cada euro reinvertido.',
    },
    {
      id: 'debt',
      group: 'negocio',
      label: 'Deuda / EBITDA',
      value: rec.quality.debtToEbitda.toFixed(1),
      threshold: '< 3',
      passed: rec.quality.debtToEbitda < 3,
      hint: 'Años de beneficio bruto que costaría saldar toda la deuda.',
    },
    {
      id: 'margin',
      group: 'negocio',
      label: 'Margen operativo estable',
      value: `${avgMargin.toFixed(1)}% (±${pctFmt(marginVariability)})`,
      threshold: 'variación ≤ 25%',
      passed: avgMargin > 0 && marginVariability <= 0.25,
      hint: 'Márgenes constantes delatan poder de fijación de precios.',
    },
    {
      id: 'fcfconv',
      group: 'negocio',
      label: 'Conversión de FCF',
      value: pctFmt(fcfConv),
      threshold: '≥ 80%',
      passed: fcfConv >= 0.8,
      hint: 'Qué parte del beneficio contable llega como caja de verdad.',
    },
    {
      id: 'fcfyears',
      group: 'negocio',
      label: 'Años con FCF positivo',
      value: `${fcfYears} de 10`,
      threshold: '≥ 8',
      passed: fcfYears >= 8,
      hint: 'La caja no se maquilla: consistencia ante todo.',
    },
    {
      id: 'epsgrowth',
      group: 'negocio',
      label: 'Crecimiento del BPA (10a)',
      value: epsCagr >= 0 ? `+${pctFmt(epsCagr, 1)}/año` : 'en pérdidas',
      threshold: '≥ 5%/año',
      passed: epsCagr >= 0.05,
      hint: 'Un beneficio por acción que compone año tras año.',
    },
    {
      id: 'mos',
      group: 'precio',
      label: 'Margen de seguridad (DCF)',
      value: rec.intrinsicValue > 0 ? pctFmt(rec.marginOfSafety) : 'sin VI fiable',
      threshold: `≥ ${pctFmt(MIN_MARGIN_OF_SAFETY)}`,
      passed: rec.marginOfSafety >= MIN_MARGIN_OF_SAFETY,
      hint: 'El colchón entre lo que pagas y lo que vale: la regla nº 1.',
    },
    {
      id: 'pe',
      group: 'precio',
      label: 'P/E actual vs su media 10a',
      value: `${rec.valuation.peCurrent.toFixed(1)} vs ${rec.valuation.peAvg10.toFixed(1)}`,
      threshold: 'actual ≤ media',
      passed: rec.valuation.peCurrent > 0 && rec.valuation.peCurrent <= rec.valuation.peAvg10,
      hint: 'Barato respecto a su propia historia, no solo al mercado.',
    },
    {
      id: 'yield',
      group: 'precio',
      label: 'Earnings yield vs bono 10a',
      value: `${pctFmt(rec.valuation.earningsYield, 1)} vs ${pctFmt(BOND_YIELD_10Y, 1)}`,
      threshold: 'bono + 2 pp',
      passed: rec.valuation.earningsYield >= BOND_YIELD_10Y + 0.02,
      hint: 'La acción debe rendir claramente más que no hacer nada.',
    },
  ]
}
