import { useEffect, useState } from 'react'
import { SYMBOLS, fetchPrice } from './market/prices'
import { usePortfolio } from './usePortfolio'
import './App.css'

export default function App() {
  const { state, positions, ready, error, trade } = usePortfolio()
  const [symbol, setSymbol] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('symbol')
    return SYMBOLS.includes(requested) ? requested : SYMBOLS[0]
  })
  const [size, setSize] = useState('1')
  const [refresh, setRefresh] = useState(0)
  const [quote, setQuote] = useState({})
  const quoteKey = `${symbol}:${refresh}`
  const currentQuote = quote.key === quoteKey ? quote : null
  const price = currentQuote?.price

  useEffect(() => {
    const controller = new AbortController()
    fetchPrice(symbol, { signal: controller.signal })
      .then(price => {
        if (!controller.signal.aborted) setQuote({ key: quoteKey, price })
      })
      .catch(error => {
        if (!controller.signal.aborted) setQuote({ key: quoteKey, error: error.message })
      })
    return () => controller.abort()
  }, [symbol, quoteKey])

  return (
    <main>
      <h1>Paper Trade</h1>
      <p>Virtual cash: {ready ? `$${state.cash.toFixed(2)}` : 'Loading…'}</p>
      <label>
        Asset
        <select value={symbol} onChange={event => setSymbol(event.target.value)}>
          {SYMBOLS.map(item => <option key={item}>{item}</option>)}
        </select>
      </label>
      <div className="quote">
        <span>Price: {price ? `$${price.toFixed(2)}` : currentQuote ? 'Unavailable' : 'Loading…'}</span>
        <button onClick={() => setRefresh(value => value + 1)} disabled={!currentQuote}>Refresh</button>
      </div>
      <label>
        Quantity
        <input type="number" min="0" step="any" value={size} onChange={event => setSize(event.target.value)} />
      </label>
      <div className="actions">
        <button disabled={!ready || !price} onClick={() => trade('buy', { symbol, size, price })}>Buy</button>
        <button disabled={!ready || !price} onClick={() => trade('sell', { symbol, size, price })}>Sell</button>
      </div>
      {(error || currentQuote?.error) && <p role="alert">{[error, currentQuote?.error].filter(Boolean).join(' ')}</p>}
      <h2>Holdings</h2>
      {positions.length ? (
        <table>
          <thead><tr><th>Asset</th><th>Quantity</th></tr></thead>
          <tbody>
            {positions.map(position => (
              <tr key={position.symbol}><td>{position.symbol}</td><td>{position.size}</td></tr>
            ))}
          </tbody>
        </table>
      ) : <p>{ready ? 'No holdings.' : 'Loading…'}</p>}
    </main>
  )
}
