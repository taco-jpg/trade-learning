import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import TradingViewWidget from '../components/TradingViewWidget'
import { usePortfolio } from '../context/PortfolioContext'
import { SUPPORTED_SYMBOLS } from '../market/providers'
import { calculateUnrealizedPnl, selectPrice } from '../engine/tradingEngine'

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return Number(value).toFixed(2)
}

const Trade = () => {
  const { state, positions, buy, sell, error } = usePortfolio()
  const [searchParams] = useSearchParams()
  const initialSymbol = searchParams.get('symbol') || SUPPORTED_SYMBOLS[0]
  const [symbol, setSymbol] = useState(initialSymbol)
  const [size, setSize] = useState('0.1')
  const [leverage, setLeverage] = useState('1')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')

  const currentPrice = selectPrice(state.prices, symbol)
  const existingPosition = useMemo(
    () => positions.find((p) => p.symbol === symbol),
    [positions, symbol]
  )
  const unrealized = existingPosition
    ? calculateUnrealizedPnl(existingPosition, currentPrice ?? existingPosition.entry_price)
    : 0

  const handleBuy = () => {
    buy({
      symbol,
      size,
      leverage,
      stop_loss: stopLoss ? Number(stopLoss) : null,
      take_profit: takeProfit ? Number(takeProfit) : null,
    })
  }

  const handleSell = () => {
    sell({ symbol, size })
  }

  return (
    <div className="page trade">
      <section className="chart-panel">
        <TradingViewWidget key={symbol} symbol={symbol} />
      </section>
      <section className="trade-panel">
        <header>
          <h2>Trade</h2>
          <span className="muted">
            Price:{' '}
            {currentPrice ? `$${formatNumber(currentPrice)}` : 'Fetching…'}
          </span>
        </header>
        <div className="form-grid">
          <label>
            Asset
            <select value={symbol} onChange={(event) => setSymbol(event.target.value)}>
              {SUPPORTED_SYMBOLS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input type="number" min="0" step="0.01" value={size} onChange={(event) => setSize(event.target.value)} />
          </label>
        </div>
        <details className="disclosure advanced-options">
          <summary>Advanced options{(leverage !== '1' || stopLoss || takeProfit) ? ' · customized' : ''}</summary>
          <div className="form-grid disclosure-content">
            <label>
              Leverage
              <select value={leverage} onChange={(event) => setLeverage(event.target.value)}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                  <option key={v} value={v}>{v}x</option>
                ))}
              </select>
            </label>
            <label>
              Stop Loss (optional)
              <input type="number" min="0" step="0.01" value={stopLoss} onChange={(event) => setStopLoss(event.target.value)} />
            </label>
            <label>
              Take Profit (optional)
              <input type="number" min="0" step="0.01" value={takeProfit} onChange={(event) => setTakeProfit(event.target.value)} />
            </label>
          </div>
        </details>
        <div className="button-row">
          <button type="button" className="primary" onClick={handleBuy}>Buy</button>
          <button type="button" className="ghost" onClick={handleSell}>Sell</button>
        </div>
        {error && <p className="error">{error}</p>}
        {existingPosition && (
          <div className="position-card">
            <h3>Your position</h3>
            <div className="position-details">
              <span>Quantity: {existingPosition.size}</span>
              <span>Entry: ${formatNumber(existingPosition.entry_price)}</span>
              {existingPosition.leverage !== 1 && <span>Leverage: {existingPosition.leverage}x</span>}
              {existingPosition.stop_loss > 0 && <span>Stop loss: ${formatNumber(existingPosition.stop_loss)}</span>}
              {existingPosition.take_profit > 0 && <span>Take profit: ${formatNumber(existingPosition.take_profit)}</span>}
              <span className={unrealized >= 0 ? 'positive' : 'negative'}>
                Unrealized: ${formatNumber(unrealized)}
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default Trade
