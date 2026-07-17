// Tests del motor de scoring: filtros duros, DCF, value trap y elegibilidad.
// Se ejecutan con `npm run test` (node --experimental-strip-types --test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mulberry32, seededRng } from './prng.ts'
import { dcfIntrinsicValue, MIN_MARGIN_OF_SAFETY } from './valuation.ts'
import { evaluateQuality } from './quality.ts'
import { mockFundamentals } from '../data/mockData.ts'
import { analyzeTicker, getDailyVerdict } from '../lib/recommendations.ts'

// Fecha fija: los datos mock son deterministas, así que los resultados no cambian.
const DATE = '2026-07-17'

test('mulberry32 es determinista para la misma semilla', () => {
  const a = mulberry32(42)
  const b = mulberry32(42)
  for (let i = 0; i < 5; i++) assert.equal(a(), b())
  assert.notEqual(seededRng('x')(), seededRng('y')())
})

test('DCF: sin owner earnings no hay valor; más crecimiento, más valor', () => {
  assert.equal(dcfIntrinsicValue(0, 0.05), 0)
  assert.equal(dcfIntrinsicValue(-2, 0.05), 0)
  const low = dcfIntrinsicValue(5, 0.02)
  const high = dcfIntrinsicValue(5, 0.08)
  assert.ok(low > 0)
  assert.ok(high > low, 'el crecimiento debe aumentar el valor intrínseco')
})

test('calidad: un compounder pasa los filtros duros; los débiles no', () => {
  const apple = evaluateQuality(mockFundamentals('AAPL', DATE))
  assert.ok(apple.passesHardFilter, `AAPL debería pasar: ${apple.failedFilters.join('; ')}`)
  assert.ok(apple.score >= 70)

  const ford = evaluateQuality(mockFundamentals('F', DATE))
  assert.ok(!ford.passesHardFilter, 'Ford no debería pasar el filtro de calidad')

  const wbd = evaluateQuality(mockFundamentals('WBD', DATE))
  assert.ok(!wbd.passesHardFilter, 'WBD (BPA en pérdidas) no debería pasar')
})

test('value trap: INTC cae fuerte con deterioro y queda descartada', async () => {
  const intc = await analyzeTicker('INTC', DATE)
  assert.ok(intc.timing.valueTrap, 'INTC debe marcarse como value trap')
  assert.ok(!intc.eligible, 'una value trap nunca es comprable')
})

test('calidad cara: NVDA pasa calidad pero nunca es comprable sin margen', async () => {
  const nvda = await analyzeTicker('NVDA', DATE)
  assert.ok(nvda.quality.passesHardFilter)
  assert.ok(nvda.marginOfSafety < MIN_MARGIN_OF_SAFETY)
  assert.ok(!nvda.eligible, 'calidad sin margen de seguridad no se compra')
})

test('veredicto del día: el pick principal cumple los tres guardarraíles', async () => {
  const v = await getDailyVerdict(DATE)
  assert.equal(v.analyzed, 24)
  assert.ok(v.primary, 'el 17/07/2026 hay compra elegible')
  const p = v.primary
  assert.ok(p.quality.passesHardFilter)
  assert.ok(p.marginOfSafety >= MIN_MARGIN_OF_SAFETY)
  assert.ok(!p.timing.valueTrap)
  // La watchlist no contiene elegibles ni value traps.
  for (const w of v.watchlist) {
    assert.ok(!w.eligible)
    assert.ok(w.quality.passesHardFilter)
    assert.ok(!w.timing.valueTrap)
  }
})
