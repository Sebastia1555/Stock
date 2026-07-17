import { HashRouter, Route, Routes } from 'react-router-dom'
import { Header, LegalNotice } from './components/Layout.tsx'
import { TabBar } from './components/TabBar.tsx'
import { setAppDate, useAppDate } from './lib/dateStore.ts'
import { Home } from './pages/Home.tsx'
import { Portfolio } from './pages/Portfolio.tsx'
import { RegisterTransaction } from './pages/RegisterTransaction.tsx'
import { TrackRecordPage } from './pages/TrackRecord.tsx'
import { StockDetail } from './pages/StockDetail.tsx'
import { Watchlist } from './pages/Watchlist.tsx'
import { History } from './pages/History.tsx'
import { Analyze } from './pages/Analyze.tsx'

function Shell() {
  const date = useAppDate()
  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <Header date={date} onDateChange={setAppDate} />
      <main className="mx-auto max-w-3xl px-5 pb-32">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cartera" element={<Portfolio />} />
          <Route path="/registrar" element={<RegisterTransaction />} />
          <Route path="/evolucion" element={<TrackRecordPage />} />
          <Route path="/analizar" element={<Analyze />} />
          <Route path="/valor/:ticker" element={<StockDetail />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/historial" element={<History />} />
          <Route path="*" element={<Home />} />
        </Routes>
        <LegalNotice />
      </main>
      <TabBar />
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
