import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Trade from './pages/Trade'
import Learn from './pages/Learn'
import Lesson from './pages/Lesson'
import Quizzes from './pages/Quizzes'
import Quiz from './pages/Quiz'
import './App.css'

const App = () => (
  <div className="app">
    <header className="app-header">
      <div className="brand">
        <span className="dot" />
        <div>
          <h1>Paper Trade</h1>
          <p>Client-side paper trading with live market data.</p>
        </div>
      </div>
      <nav>
        <NavLink to="/learn">Learn</NavLink>
        <NavLink to="/quizzes">Quizzes</NavLink>
        <NavLink to="/dash">Dashboard</NavLink>
        <NavLink to="/trade">Trade</NavLink>
      </nav>
    </header>
    <main>
      <Routes>
        <Route path="/" element={<Navigate to="/dash" replace />} />
        <Route path="/dash" element={<Dashboard />} />
        <Route path="/trade" element={<Trade />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/learn/:lessonSlug" element={<Lesson />} />
        <Route path="/quizzes" element={<Quizzes />} />
        <Route path="/quizzes/:quizSlug" element={<Quiz />} />
      </Routes>
    </main>
  </div>
)

export default App
