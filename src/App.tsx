import { HashRouter, Route, Routes } from 'react-router-dom'
import { Header, LegalNotice } from './components/Layout.tsx'
import { TabBar } from './components/TabBar.tsx'
import { setAppDate, useAppDate } from './lib/dateStore.ts'
import { Home } from './pages/Home.tsx'
import { Portfolio } from './pages/Portfolio.tsx'
import { RegisterTransaction } from './pages/RegisterTransaction.tsx'

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
