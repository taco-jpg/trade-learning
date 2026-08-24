import { useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Trade from './pages/Trade'
import './App.css'

const App = () => {
  const [crazytown, setCrazytown] = useState(false)

  return (
    <div className={`app${crazytown ? ' crazytown' : ''}`}>
      <div className="crazy-confetti" aria-hidden="true">💸 ✨ 🛸 📈 🪩 🐸 💰 ✨</div>
      <header className="app-header">
        <div className="brand">
          <span className="dot" />
          <div>
            <h1>Yamboisid</h1>
            <p>{crazytown ? 'TINKLE MODE: the market has left the building.' : 'Client-side paper trading with live market data.'}</p>
          </div>
        </div>
        <nav>
          <NavLink to="/dash">Dashboard</NavLink>
          <NavLink to="/trade">Trade</NavLink>
          <button
            className="crazy-toggle"
            type="button"
            aria-pressed={crazytown}
            onClick={() => setCrazytown((enabled) => !enabled)}
          >
            {crazytown ? 'Make normal' : 'Go crazytown'}
          </button>
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
}

export default App
