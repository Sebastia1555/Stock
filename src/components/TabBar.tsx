// Barra de pestañas inferior (estilo iOS): Hoy · Registrar · Cartera.
// Hace visible el ciclo de la app: ver la recomendación → registrarla → seguir la cartera.
import { Link, useLocation } from 'react-router-dom'

function IconToday({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
      <path d="M8.5 15.5l2.5 2 4.5-4.5" />
    </svg>
  )
}

function IconRegister({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.75" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  )
}

function IconPortfolio({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5V10M9.5 19.5V5.5M15 19.5v-7M20.5 19.5V8.5" />
    </svg>
  )
}

function IconSearch({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.75" />
      <path d="M15.5 15.5L20.5 20.5" />
    </svg>
  )
}

function IconTrack({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 20.5h17" />
      <path d="M4 16l4.5-5 3.5 3 4-6.5 4 3" />
    </svg>
  )
}

const TABS = [
  { to: '/', label: 'Hoy', Icon: IconToday },
  { to: '/analizar', label: 'Analizar', Icon: IconSearch },
  { to: '/registrar', label: 'Registrar', Icon: IconRegister },
  { to: '/cartera', label: 'Cartera', Icon: IconPortfolio },
  { to: '/evolucion', label: 'Evolución', Icon: IconTrack },
] as const

export function TabBar() {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-hairline)] bg-[var(--color-canvas)]/90 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto grid max-w-3xl grid-cols-5">
        {TABS.map(({ to, label, Icon }) => {
          const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                active ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
              }`}
            >
              <Icon active={active} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
