// Menú ☰ de la cabecera: acceso a todas las secciones de la app.
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const ITEMS = [
  { to: '/', label: 'Hoy', desc: 'La recomendación del día' },
  { to: '/analizar', label: 'Analizar acción', desc: 'KPIs Buffett de cualquier valor' },
  { to: '/watchlist', label: 'Watchlist', desc: 'Excelentes esperando su precio' },
  { to: '/historial', label: 'Historial del motor', desc: 'Picks pasados e hit rate' },
  { to: '/registrar', label: 'Registrar operación', desc: 'Apunta una compra o venta' },
  { to: '/cartera', label: 'Mi cartera', desc: 'Posiciones y P/L' },
  { to: '/evolucion', label: 'Evolución', desc: 'Tu track record vs S&P 500' },
] as const

export function Menu() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  // Cierra al navegar y con Escape.
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="relative">
      <button
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-parchment)] text-[var(--color-ink)]"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M4 4l10 10M14 4L4 14" /> : <path d="M3 5h12M3 9h12M3 13h12" />}
        </svg>
      </button>

      {open && (
        <>
          <button
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default bg-black/25"
          />
          <nav
            aria-label="Menú de secciones"
            className="absolute right-0 z-40 mt-2 w-[300px] overflow-hidden rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-canvas)] shadow-[var(--shadow-product)]"
          >
            {ITEMS.map((it) => {
              const active = it.to === '/' ? pathname === '/' : pathname.startsWith(it.to)
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={`block border-b border-[var(--color-hairline)] px-4 py-3 last:border-b-0 ${
                    active ? 'bg-[var(--color-accent)]/6' : 'hover:bg-[var(--color-parchment)]'
                  }`}
                >
                  <div className={`text-[15px] font-semibold ${active ? 'text-[var(--color-accent)]' : ''}`}>{it.label}</div>
                  <div className="text-[12px] text-[var(--color-ink-soft)]">{it.desc}</div>
                </Link>
              )
            })}
          </nav>
        </>
      )}
    </div>
  )
}
