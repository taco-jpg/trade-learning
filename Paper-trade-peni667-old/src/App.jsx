import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Trade from './pages/Trade'
import './App.css'

const App = () => (
  <div className="app">
    <header className="app-header">
      <div className="brand">
        <h1>Paper Trade</h1>
      </div>
      <nav aria-label="Main navigation">
        <NavLink to="/dash">Portfolio</NavLink>
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
