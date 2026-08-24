import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Trade from './pages/Trade'
import './App.css'

const App = () => (
  <div className="app">
    <header className="app-header">
      <div className="brand">
        <span className="dot" />
        <div>
          <h1>Yamboisid</h1>
          <p>Client-side paper trading with live market data.</p>
        </div>
      </div>
      <nav>
        <NavLink to="/dash">Dashboard</NavLink>
        <NavLink to="/trade">Trade</NavLink>
      </nav>
    </header>
    <main>
      <Routes>
        <Route path="/" element={<Navigate to="/dash" replace />} />
        <Route path="/dash" element={<Dashboard />} />
        <Route path="/trade" element={<Trade />} />
      </Routes>
    </main>
  </div>
)

export default App

