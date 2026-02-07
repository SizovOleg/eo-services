import React, { lazy, Suspense } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home'
import OrbitHistory from './pages/OrbitHistory'

// Lazy load heavy pages
const OGCalc = lazy(() => import('./pages/OGCalc'))
const OrbitDesigner = lazy(() => import('./pages/OrbitDesigner'))
const Coverage = lazy(() => import('./pages/Coverage'))
const PassCalc = lazy(() => import('./pages/PassCalc'))

const Loading = () => <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Загрузка...</div>

const SatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8">
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="9" strokeDasharray="3 3" opacity="0.35" />
    <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
  </svg>
)

export default function App() {
  return (
    <div className="app-layout">
      <nav className="nav">
        <NavLink to="/" className="nav-logo">
          <SatIcon />
          <span>EO Services</span>
        </NavLink>
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Главная
          </NavLink>
          <NavLink to="/orbit-history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Орбита
          </NavLink>
          <NavLink to="/og-calc" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Калькулятор ОГ
          </NavLink>
          <NavLink to="/orbit-designer" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Конструктор
          </NavLink>
          <NavLink to="/coverage" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Покрытие
          </NavLink>
          <NavLink to="/pass-calc" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Пролёты
          </NavLink>
        </div>
      </nav>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/orbit-history" element={<OrbitHistory />} />
          <Route path="/og-calc" element={<OGCalc />} />
          <Route path="/orbit-designer" element={<OrbitDesigner />} />
          <Route path="/coverage" element={<Coverage />} />
          <Route path="/pass-calc" element={<PassCalc />} />
        </Routes>
      </Suspense>
    </div>
  )
}
