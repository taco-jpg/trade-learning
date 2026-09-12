import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
  const totalPnl = realizedPnl + totalUnrealized

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
          <span>Portfolio value</span>
          <strong>${formatNumber(portfolioValue)}</strong>
        </div>
        <div className="card">
          <span>Cash</span>
          <strong>${formatNumber(state.cash)}</strong>
        </div>
        <div className="card">
          <span>Profit/loss</span>
          <strong className={totalPnl >= 0 ? 'positive' : 'negative'}>
            ${formatSigned(totalPnl)}
          </strong>
        </div>
      </section>

      <div className="toolbar">
        <button type="button" onClick={refreshPrices} disabled={priceLoading}>
          {priceLoading ? 'Refreshing…' : 'Refresh prices'}
        </button>
        <span className="muted">
          Updated {state.lastUpdated ? new Date(state.lastUpdated).toLocaleString() : '—'}
        </span>
      </div>

      {error && <p className="error banner" role="alert">{error}</p>}

      <section className="panel">
        <header>
          <h2>Holdings</h2>
          <span>{positions.length} assets</span>
        </header>
        {positions.length === 0 ? (
          <p className="muted">No holdings yet. <Link to="/trade">Find an asset</Link> to get started.</p>
        ) : (
          <div className="table-scroll">
            <table className="positions-table" aria-label="Current holdings">
              <thead>
                <tr>
                  <th scope="col">Asset</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Avg cost</th>
                  <th scope="col">Price</th>
                  <th scope="col">Profit/loss</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => {
                  const price = selectPrice(state.prices, pos.symbol, pos.entry_price)
                  const unrealized = calculateUnrealizedPnl(pos, price)
                  const positionDetails = [
                    pos.leverage > 1 && `${pos.leverage}× leverage`,
                    pos.stop_loss && `Stop $${formatNumber(pos.stop_loss)}`,
                    pos.take_profit && `Target $${formatNumber(pos.take_profit)}`,
                  ].filter(Boolean).join(' · ')
                  return (
                    <tr key={pos.symbol}>
                      <th scope="row">
                        <Link to={`/trade?symbol=${encodeURIComponent(pos.symbol)}`}>{pos.symbol}</Link>
                        {positionDetails && <span className="position-meta">{positionDetails}</span>}
                      </th>
                      <td>{pos.size}</td>
                      <td>${formatNumber(pos.entry_price)}</td>
                      <td>${formatNumber(price)}</td>
                      <td className={unrealized >= 0 ? 'positive' : 'negative'}>
                        ${formatSigned(unrealized)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <details className="panel disclosure">
        <summary>
          <span>History</span>
          <span className="muted">{state.history.length} events</span>
        </summary>
        <div className="disclosure-content">
          {state.history.length === 0 ? (
            <p className="muted">No trades yet.</p>
          ) : (
            <ul className="history">
              {state.history.map((item) => (
                <li key={item.id}>
                  <div>
                    {item.symbol === 'CASH' ? (
                      <strong>Cash</strong>
                    ) : (
                      <Link to={`/trade?symbol=${encodeURIComponent(item.symbol)}`}>{item.symbol}</Link>
                    )}
                    <span className="pill">{item.action.replace('_', ' ')}</span>
                    <span className="muted">{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="history-details">
                    <span>Quantity: {item.size}</span>
                    <span>Price: ${formatNumber(item.price)}</span>
                    <span className={item.pnl >= 0 ? 'positive' : 'negative'}>
                      Profit/loss: ${formatSigned(item.pnl)}
                    </span>
                    {item.note && <span className="muted">{item.note}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <details className="panel disclosure">
        <summary>Portfolio tools</summary>
        <div className="disclosure-content controls">
          <form className="control-group" onSubmit={(event) => { event.preventDefault(); handleAddCash() }}>
            <label htmlFor="add-cash">Add cash (USD)</label>
            <div className="inline-input">
              <input id="add-cash" type="number" min="0" step="0.01" placeholder="Amount" value={cashInput} onChange={(event) => setCashInput(event.target.value)} />
              <button type="submit">Add</button>
            </div>
          </form>
          <div className="control-group">
            <span>Saved portfolio</span>
            <div className="inline-input">
              <button type="button" onClick={handleExport}>Export</button>
              <button type="button" onClick={() => fileRef.current?.click()}>Import</button>
              <button type="button" className="ghost" onClick={handleReset}>Reset</button>
              <input ref={fileRef} type="file" accept="application/json" aria-label="Import portfolio file" onChange={handleImport} hidden />
            </div>
            {importError && <p className="error" role="alert">{importError}</p>}
          </div>
        </div>
      </details>
    </div>
  )
}

export default Dashboard
