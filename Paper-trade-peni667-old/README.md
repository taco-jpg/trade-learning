# Yamboisid

Free paper trading app built with React + Vite for Cloudflare Pages. The app stores all portfolio state in IndexedDB and pulls prices from free, keyless CoinGecko (crypto) and Stooq (stocks) endpoints.

## Features
- Two routes: `/dash` for portfolio dashboard and `/trade` for trading interface.
- Live market data from CoinGecko (BTC, ETH) and Stooq (AAPL, TSLA) — no account, paid plan, or API key required.
- Trading engine with leverage (1x–10x), stop loss, take profit, and liquidation at -100% loss.
- IndexedDB persistence with import/export/reset.
- Dark, minimalist UI with TradingView chart integration.

## Getting Started
```bash
npm install
npm run dev
```

All quote sources are free and need no API keys. The Cloudflare Pages function
at `/api/quotes` proxies Stooq so browsers receive stock prices without exposing
credentials or depending on third-party CORS behavior. Market-data requests time
out after 10 seconds and retain the last cached quote if a source is unavailable.

## Build
```bash
npm run build
```

## Lint
```bash
npm run lint
```
