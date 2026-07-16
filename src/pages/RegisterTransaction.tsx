// Registrar operación (manual): compra/venta con validación y persistencia local.
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Constituent, TransactionType } from '../types.ts'
import { getQuote, getSP500Constituents } from '../data/provider.ts'
import { useAppDate } from '../lib/dateStore.ts'
import { addTransaction, removeTransaction, updateTransaction, useTransactions } from '../lib/txStore.ts'
import { heldSharesAt } from '../lib/portfolio.ts'
import { money } from '../lib/format.ts'
import { Card } from '../components/ui.tsx'

const inputCls =
  'w-full rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 py-2.5 text-[15px] outline-none focus:border-[var(--color-accent)]'

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-[var(--color-ink-soft)]">{hint}</span>}
    </label>
  )
}

export function RegisterTransaction() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const appDate = useAppDate()
  const transactions = useTransactions()

  const editId = params.get('id')
  const editing = useMemo(() => transactions.find((t) => t.id === editId), [transactions, editId])

  const [universe, setUniverse] = useState<Constituent[]>([])
  const [ticker, setTicker] = useState(editing?.ticker ?? params.get('ticker') ?? '')
  const [type, setType] = useState<TransactionType>(editing?.type ?? 'compra')
  const [date, setDate] = useState(editing?.date ?? appDate)
  const [price, setPrice] = useState(editing ? String(editing.price) : '')
  const [shares, setShares] = useState(editing ? String(editing.shares) : '')
  const [fees, setFees] = useState(editing ? String(editing.fees) : '0')
  const [thesis, setThesis] = useState(editing?.thesis ?? '')
  const [priceTouched, setPriceTouched] = useState(Boolean(editing))
  const [error, setError] = useState('')

  useEffect(() => {
    getSP500Constituents().then(setUniverse)
  }, [])

  // Prefill del precio con la cotización del día activo (si el usuario no lo ha tocado).
  useEffect(() => {
    if (!ticker || priceTouched) return
    let active = true
    getQuote(ticker).then((q) => {
      if (active) setPrice(String(q.price))
    })
    return () => {
      active = false
    }
  }, [ticker, appDate, priceTouched])

  const nPrice = parseFloat(price)
  const nShares = parseFloat(shares)
  const nFees = parseFloat(fees) || 0
  const gross = (nPrice || 0) * (nShares || 0)
  const total = type === 'compra' ? gross + nFees : gross - nFees

  function save() {
    if (!ticker) return setError('Elige un valor.')
    if (!date) return setError('Indica la fecha de la operación.')
    if (!(nPrice > 0)) return setError('El precio debe ser mayor que 0.')
    if (!(nShares > 0)) return setError('El número de acciones debe ser mayor que 0.')
    if (nFees < 0) return setError('Las comisiones no pueden ser negativas.')
    if (type === 'venta') {
      const held = heldSharesAt(transactions, ticker, date, editing?.id)
      if (nShares > held + 1e-9) {
        return setError(
          held > 0
            ? `No puedes vender más acciones de las que tenías en esa fecha (${held} el ${date}).`
            : `En esa fecha no tenías acciones de ${ticker}: registra antes la compra.`,
        )
      }
    }
    const data = { ticker, type, date, price: nPrice, shares: nShares, fees: nFees, thesis: thesis.trim() }
    if (editing) updateTransaction(editing.id, data)
    else addTransaction(data)
    navigate('/cartera')
  }

  function del() {
    if (editing && confirm('¿Eliminar esta operación? Esta acción no se puede deshacer.')) {
      removeTransaction(editing.id)
      navigate('/cartera')
    }
  }

  return (
    <>
      <div className="pt-6">
        <h1 className="text-[28px] font-semibold">{editing ? 'Editar operación' : 'Registrar operación'}</h1>
        <p className="mt-1 text-[15px] text-[var(--color-ink-soft)]">
          Apunta cada compra o venta para seguir tu cartera y tu disciplina.
        </p>
      </div>

      <Card className="mt-5 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Valor">
            <select value={ticker} onChange={(e) => setTicker(e.target.value)} className={inputCls}>
              <option value="">Elige un valor…</option>
              {universe.map((c) => (
                <option key={c.ticker} value={c.ticker}>
                  {c.ticker} — {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tipo de operación">
            <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-[var(--color-parchment)] p-1" role="radiogroup" aria-label="Tipo de operación">
              {(['compra', 'venta'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={type === t}
                  onClick={() => setType(t)}
                  className={`rounded-[8px] py-2 text-[14px] font-semibold capitalize transition-colors ${
                    type === t ? 'bg-[var(--color-canvas)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-soft)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Fecha">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`num ${inputCls}`} />
          </Field>

          <Field label="Precio por acción (US$)" hint="Precargado con la cotización del día seleccionado.">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => {
                setPriceTouched(true)
                setPrice(e.target.value)
              }}
              className={`num ${inputCls}`}
              placeholder="0,00"
            />
          </Field>

          <Field label="Nº de acciones">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className={`num ${inputCls}`}
              placeholder="0"
            />
          </Field>

          <Field label="Comisiones (US$)">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={fees}
              onChange={(e) => setFees(e.target.value)}
              className={`num ${inputCls}`}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Mi tesis" hint="Tu razón para operar. Te la recordaremos si los fundamentales se deterioran.">
            <textarea
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              rows={3}
              className={inputCls}
              placeholder="¿Por qué compras? P. ej.: negocio excelente con margen de seguridad del 30%…"
            />
          </Field>
        </div>

        <div className="mt-5 flex items-baseline justify-between rounded-[12px] bg-[var(--color-parchment)] px-4 py-3">
          <span className="text-[14px] text-[var(--color-ink-soft)]">
            {type === 'compra' ? 'Importe total (con comisiones)' : 'Importe neto (tras comisiones)'}
          </span>
          <span className="num text-[20px] font-semibold">{money(isFinite(total) ? total : 0)}</span>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-[14px] font-medium text-[var(--color-loss)]">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={save}
            className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-600)]"
          >
            {editing ? 'Guardar cambios' : type === 'compra' ? 'Registrar compra' : 'Registrar venta'}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-parchment)] px-6 py-3 text-[15px] font-semibold text-[var(--color-ink)]"
          >
            Cancelar
          </button>
          {editing && (
            <button onClick={del} className="ml-auto rounded-full px-4 py-3 text-[15px] font-semibold text-[var(--color-loss)]">
              Eliminar
            </button>
          )}
        </div>
      </Card>
    </>
  )
}
