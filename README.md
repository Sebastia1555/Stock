# Stock&Sebas 📈

**Recomendador value diario del S&P 500.** Cada día, la app dice qué acción comprar siguiendo la
filosofía Buffett/Graham — negocios excelentes a precio razonable con margen de seguridad — para
invertir poco y a menudo, registrar tus operaciones y comparar tu track record con el índice.

> **Principio de disciplina:** la app NO fuerza una compra diaria. Si ningún valor pasa calidad +
> margen de seguridad ≥ 25%, la Home dice claramente *"Hoy no hay compra"*. Comprar calidad cara o
> basura barata está prohibido por diseño.

## Pantallas

| Pestaña / ruta | Qué hace |
|---|---|
| **Hoy** (`/`) | Recomendación del día con tesis, alternativas, veredicto de mercado y watchlist |
| **Registrar** (`/registrar`) | Alta/edición de compras y ventas con validación cronológica y tesis propia |
| **Cartera** (`/cartera`) | Posiciones por coste medio, P/L latente y realizado, pesos y aviso de *tesis en riesgo* |
| **Evolución** (`/evolucion`) | Curva de patrimonio vs S&P 500 (mismos flujos), TWR, XIRR, win rate |
| Detalle (`/valor/:ticker`) | Checklist Buffett (foso, balance, predecibilidad, descuento), DCF, Graham y 10 años de fundamentales |
| Watchlist (`/watchlist`) | Negocios excelentes aún caros, con su precio de compra objetivo |
| Historial (`/historial`) | Picks pasados del motor y su hit rate vs índice |

## El motor (`src/engine/`)

Tres capas independientes y testeadas; un valor solo es **comprable** si pasa las tres:

1. **Calidad** — filtros duros (ROE 10a > 12%, Deuda/EBITDA < 3, FCF positivo ≥ 8/10 años, BPA
   estable, margen operativo > 0) + score ponderado por ROIC, crecimiento, balance, márgenes y
   conversión de caja.
2. **Valoración** — DCF a dos etapas sobre owner earnings (crecimiento conservador ≤ 8%, descuento
   9,5%, terminal 2,5%). Exige **margen de seguridad ≥ 25%**. Cross-checks: nº de Graham, P/E
   histórico, earnings yield vs bono.
3. **Timing** — caída desde máximos de 52 semanas, precio vs MA200, RSI, y detección de **value
   traps** (caída fuerte + deterioro del negocio → descartada).

Ranking final: Calidad 45% · Valoración 40% · Timing 15%.

## Stack

React 19 · TypeScript estricto · Vite · Tailwind CSS v4 · React Router (HashRouter) · oxlint ·
`node:test`. PWA instalable (manifest + service worker propio). Gráficos SVG sin librerías.

```bash
npm install
npm run dev      # desarrollo
npm run test     # tests del motor y la cartera (11 tests)
npm run lint     # oxlint
npm run build    # tsc + vite build → dist/
```

## Datos

En esta fase los datos de mercado son **simulados y deterministas** (`src/data/mockData.ts`):
~24 perfiles del S&P 500 generados con un PRNG sembrado por ticker, y una deriva de mercado por
fecha (ciclos suaves) que hace que la recomendación "viva" día a día — incluidos días sin compra.

Toda la UI y el motor consumen la interfaz async de `src/data/provider.ts` (`getQuote`,
`getFundamentals`, `getPriceHistory`, `getSP500Constituents`, `getBenchmark`…). Para conectar
datos reales (p. ej. Finnhub) basta con reimplementar ese módulo; ni la UI ni el motor cambian.

## Despliegue

GitHub Actions construye y despliega `dist/` a GitHub Pages en cada push (`.github/workflows/deploy.yml`).
Requiere activarlo una vez en el repositorio:

1. **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Environments → github-pages**: permitir la rama de despliegue.

## Aviso legal

Es una herramienta de análisis y registro personal; no constituye asesoramiento financiero. Las
decisiones de inversión y sus riesgos son responsabilidad exclusiva del usuario.
