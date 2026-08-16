import { useEffect, useRef, memo } from 'react'

const SYMBOL_MAP = {
  'BTC-USD': 'COINBASE:BTCUSD',
  'ETH-USD': 'COINBASE:ETHUSD',
  'AAPL': 'NASDAQ:AAPL',
  'TSLA': 'NASDAQ:TSLA',
}

function toTradingViewSymbol(symbol) {
  return SYMBOL_MAP[symbol] || `NASDAQ:${symbol}`
}

function TradingViewWidget({ symbol = 'BTC-USD' }) {
  const containerRef = useRef(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const el = containerRef.current
    if (!el) return

    const script = document.createElement('script')
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.innerHTML = JSON.stringify({
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: '60',
      locale: 'en',
      save_image: true,
      style: '1',
      symbol: toTradingViewSymbol(symbol),
      theme: 'dark',
      timezone: 'America/Los_Angeles',
      backgroundColor: '#0F0F0F',
      gridColor: 'rgba(242, 242, 242, 0.06)',
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      studies: [],
      autosize: true,
    })
    el.appendChild(script)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="tradingview-widget-container" ref={containerRef} />
}

// Key by symbol so React remounts on symbol change.
// The embed widget has no runtime API — remount is the only correct approach.
// No iframe mutation, no DOM hacking.
export default memo(TradingViewWidget)
