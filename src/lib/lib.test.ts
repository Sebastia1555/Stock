// Tests de cartera y track record: coste medio, validación de ventas, XIRR y curva.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Transaction } from '../types.ts'
import { getPriceOn } from '../data/provider.ts'
import { buildPortfolio, heldSharesAt } from './portfolio.ts'
import { buildTrackRecord, xirr } from './trackRecord.ts'

const DATE = '2026-07-17'

function tx(partial: Partial<Transaction> & Pick<Transaction, 'ticker' | 'date' | 'type' | 'price' | 'shares'>): Transaction {
  return { id: Math.random().toString(36).slice(2), fees: 0, thesis: '', ...partial }
}

test('xirr: −100 hoy → +110 en un año ≈ 10%', () => {
  const r = xirr([
    { date: '2025-01-01', amount: -100 },
    { date: '2026-01-01', amount: 110 },
  ])
  assert.ok(r !== null && Math.abs(r - 0.1) < 0.005, `esperado ~0.10, obtenido ${r}`)
})

test('heldSharesAt respeta la cronología: no se vende lo aún no comprado', () => {
  const txs = [tx({ ticker: 'CSCO', date: '2026-06-15', type: 'compra', price: 30, shares: 10 })]
  assert.equal(heldSharesAt(txs, 'CSCO', '2026-06-01'), 0)
  assert.equal(heldSharesAt(txs, 'CSCO', '2026-06-15'), 10)
  assert.equal(heldSharesAt(txs, 'CSCO', '2026-07-01'), 10)
  assert.equal(heldSharesAt(txs, 'CSCO', '2026-07-01', txs[0].id), 0, 'excluir la operación en edición')
})

test('cartera: coste medio con comisiones y P/L coherentes', async () => {
  const txs = [
    tx({ ticker: 'CSCO', date: '2026-06-15', type: 'compra', price: 30, shares: 10, fees: 1 }),
    tx({ ticker: 'CSCO', date: '2026-07-01', type: 'venta', price: 40, shares: 4, fees: 1 }),
  ]
  const s = await buildPortfolio(txs, DATE)
  assert.equal(s.positions.length, 1)
  const p = s.positions[0]
  const avg = 301 / 10 // (30×10 + 1) / 10
  assert.ok(Math.abs(p.avgCost - avg) < 1e-9)
  assert.equal(p.shares, 6)
  const price = await getPriceOn('CSCO', DATE)
  assert.ok(Math.abs(p.currentValue - 6 * price) < 0.02)
  // P/L realizado: (40 − 30,1) × 4 − 1 comisión
  assert.ok(Math.abs(s.realized - ((40 - avg) * 4 - 1)) < 1e-6)
  assert.ok(Math.abs(p.weight - 1) < 1e-9, 'única posición pesa el 100%')
})

test('track record: valor final exacto y retorno simple consistente', async () => {
  const p0 = await getPriceOn('GILD', '2026-06-10')
  const txs = [tx({ ticker: 'GILD', date: '2026-06-10', type: 'compra', price: p0, shares: 5, fees: 1 })]
  const r = await buildTrackRecord(txs, DATE)
  assert.ok(r)
  const last = r.points[r.points.length - 1]
  const priceNow = await getPriceOn('GILD', DATE)
  assert.ok(Math.abs(last.value - 5 * priceNow) < 0.02)
  const cost = p0 * 5 + 1
  assert.ok(Math.abs(r.simpleReturn - (last.value - cost) / cost) < 1e-6)
  // Sin ventas y con una sola compra, TWR y retorno simple coinciden.
  assert.ok(Math.abs(r.twr - r.simpleReturn) < 1e-6)
  assert.equal(r.points[0].date, '2026-06-10')
  assert.equal(last.date, DATE)
})

test('track record: una venta parcial reduce aportado y genera realizado', async () => {
  const p0 = await getPriceOn('CSCO', '2026-05-15')
  const p1 = await getPriceOn('CSCO', '2026-07-01')
  const txs = [
    tx({ ticker: 'CSCO', date: '2026-05-15', type: 'compra', price: p0, shares: 10 }),
    tx({ ticker: 'CSCO', date: '2026-07-01', type: 'venta', price: p1, shares: 10 }),
  ]
  const r = await buildTrackRecord(txs, DATE)
  assert.ok(r)
  const last = r.points[r.points.length - 1]
  assert.ok(Math.abs(last.value) < 1e-9, 'todo vendido: valor 0')
  assert.ok(Math.abs(last.invested - (p0 * 10 - p1 * 10)) < 0.02, 'aportado neto = compra − venta')
})
