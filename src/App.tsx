import { HashRouter, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home.tsx'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </HashRouter>
  )
}
