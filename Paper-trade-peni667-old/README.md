# Paper Trade

Client-side paper trading app built with React + Vite for Cloudflare Pages. The app stores all portfolio state in IndexedDB and pulls live prices from CoinGecko (crypto) and Finnhub (stocks) using polling.

## Features
- Two routes: `/dash` for portfolio dashboard and `/trade` for trading interface.
- Live market data from CoinGecko (BTC, ETH) and Finnhub (AAPL, TSLA) — no backend required.
- Trading engine with leverage (1x–10x), stop loss, take profit, and liquidation at -100% loss.
- IndexedDB persistence with import/export/reset.
- Dark, minimalist UI with TradingView chart integration.

## Getting Started
```bash
npm install
cp .env.example .env.local
# Add your Finnhub API key to .env.local to enable stock quotes.
npm run dev
```

Crypto quotes work without a key. Stock quotes require a Finnhub key in
`VITE_FINNHUB_API_KEY`; the local environment file is ignored by Git so the key
is not committed. Market-data requests time out after 10 seconds and surface a
provider error while retaining the last cached quote.

## Build
```bash
npm run build
```

## Lint
```bash
npm run lint
```
