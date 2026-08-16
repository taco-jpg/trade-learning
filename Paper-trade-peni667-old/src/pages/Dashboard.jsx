import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { calculateUnrealizedPnl, selectPrice } from '../engine/tradingEngine'
import { usePortfolio } from '../context/PortfolioContext'

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return Number(value).toFixed(2)
}

const formatSigned = (value) => {
  const numeric = Number(value)
  const prefix = numeric > 0 ? '+' : ''
  return `${prefix}${numeric.toFixed(2)}`
}

const Dashboard = () => {
  const {
    state,
    positions,
    portfolioValue,
    realizedPnl,
    error,
    priceLoading,
    refreshPrices,
    addBuyingPower,
    resetPortfolio,
    importPortfolio,
  } = usePortfolio()
  const navigate = useNavigate()
  const [cashInput, setCashInput] = useState('')
  const [importError, setImportError] = useState('')
  const fileRef = useRef(null)

  const totalUnrealized = useMemo(
    () =>
      positions.reduce((total, pos) => {
        const price = selectPrice(state.prices, pos.symbol, pos.entry_price)
        return total + calculateUnrealizedPnl(pos, price)
      }, 0),
    [positions, state.prices]
  )

  const handleAddCash = () => {
    if (addBuyingPower(cashInput)) setCashInput('')
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `portfolio-${new Date().toISOString()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      importPortfolio(JSON.parse(text))
      setImportError('')
    } catch {
      setImportError('Invalid portfolio file.')
    } finally {
      event.target.value = ''
    }
  }

  const handleReset = () => {
    if (window.confirm('Reset portfolio and clear stored data?')) resetPortfolio()
  }

  return (
    <div className="page">
      <section className="summary">
        <div className="card">
          <span>Portfolio Value</span>
          <strong>${formatNumber(portfolioValue)}</strong>
        </div>
        <div className="card">
          <span>Cash Balance</span>
          <strong>${formatNumber(state.cash)}</strong>
        </div>
        <div className="card">
          <span>Unrealized PnL</span>
          <strong className={totalUnrealized >= 0 ? 'positive' : 'negative'}>
            ${formatSigned(totalUnrealized)}
          </strong>
        </div>
        <div className="card">
          <span>Realized PnL</span>
          <strong className={realizedPnl >= 0 ? 'positive' : 'negative'}>
            ${formatSigned(realizedPnl)}
          </strong>
        </div>
      </section>

      <section className="controls">
        <div className="control-group">
          <button type="button" className="primary" onClick={refreshPrices} disabled={priceLoading}>
            {priceLoading ? 'Refreshing…' : 'Refresh Prices'}
          </button>
          <div className="meta">
            Last update: <span>{state.lastUpdated ? new Date(state.lastUpdated).toLocaleString() : '—'}</span>
          </div>
        </div>
        <div className="control-group">
          <label htmlFor="add-cash">Add Buying Power</label>
          <div className="inline-input">
            <input id="add-cash" type="number" min="0" step="0.01" placeholder="USD" value={cashInput} onChange={(event) => setCashInput(event.target.value)} />
            <button type="button" onClick={handleAddCash}>Add</button>
          </div>
        </div>
        <div className="control-group">
          <label>Portfolio Actions</label>
          <div className="inline-input">
            <button type="button" onClick={handleExport}>Export JSON</button>
            <button type="button" onClick={() => fileRef.current?.click()}>Import JSON</button>
            <button type="button" className="ghost" onClick={handleReset}>Reset</button>
            <input ref={fileRef} type="file" accept="application/json" onChange={handleImport} hidden />
          </div>
          {importError && <p className="error">{importError}</p>}
        </div>
      </section>

      {error && <p className="error banner">{error}</p>}

      <section className="panel">
        <header>
          <h2>Open Positions</h2>
          <span>{positions.length} open</span>
        </header>
        {positions.length === 0 ? (
          <p className="muted">No open positions yet.</p>
        ) : (
          <div className="table">
            <div className="table-row header">
              <span>Symbol</span>
              <span>Size</span>
              <span>Entry</span>
              <span>Price</span>
              <span>Leverage</span>
              <span>SL / TP</span>
              <span>Unrealized</span>
            </div>
            {positions.map((pos) => {
              const price = selectPrice(state.prices, pos.symbol, pos.entry_price)
              const unrealized = calculateUnrealizedPnl(pos, price)
              return (
                <div className="table-row clickable" key={pos.symbol} onClick={() => navigate(`/trade?symbol=${pos.symbol}`)}>
                  <span>{pos.symbol}</span>
                  <span>{pos.size}</span>
                  <span>${formatNumber(pos.entry_price)}</span>
                  <span>${formatNumber(price)}</span>
                  <span>{pos.leverage}x</span>
                  <span>
                    {pos.stop_loss ? `$${formatNumber(pos.stop_loss)}` : '—'} /{' '}
                    {pos.take_profit ? `$${formatNumber(pos.take_profit)}` : '—'}
                  </span>
                  <span className={unrealized >= 0 ? 'positive' : 'negative'}>
                    ${formatSigned(unrealized)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <header>
          <h2>Trade History</h2>
          <span>{state.history.length} events</span>
        </header>
        {state.history.length === 0 ? (
          <p className="muted">No trades yet.</p>
        ) : (
          <ul className="history">
            {state.history.map((item) => (
              <li key={item.id} className="clickable" onClick={() => { if (item.symbol !== 'CASH') navigate(`/trade?symbol=${item.symbol}`) }}>
                <div>
                  <strong>{item.symbol}</strong>
                  <span className="pill">{item.action.replace('_', ' ')}</span>
                  <span className="muted">{new Date(item.timestamp).toLocaleString()}</span>
                </div>
                <div className="history-details">
                  <span>Size: {item.size}</span>
                  <span>Price: ${formatNumber(item.price)}</span>
                  <span className={item.pnl >= 0 ? 'positive' : 'negative'}>
                    PnL: ${formatSigned(item.pnl)}
                  </span>
                  {item.note && <span className="muted">{item.note}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Dashboard
