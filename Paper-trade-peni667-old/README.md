# Paper Trade

Client-side paper trading app built with React + Vite for Cloudflare Pages. The app stores all portfolio state in IndexedDB and pulls live prices from CoinGecko (crypto) and Finnhub (stocks) using polling.

## Features
- Two routes: `/dash` for portfolio dashboard and `/trade` for trading interface.
- Live market data from CoinGecko (BTC, ETH) and Finnhub (AAPL, TSLA) — no backend required.
- Trading engine with leverage (1x–10x), stop loss, take profit, and liquidation at -100% loss.
- IndexedDB persistence with import/export/reset.
- Dark, minimalist UI with TradingView chart integration.
- A 40-lesson trading curriculum organized into eight modules.
- Separate module quizzes with answer explanations and locally saved progress.

## Getting Started
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Lint
```bash
npm run lint
```
