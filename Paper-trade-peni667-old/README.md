# Paper Trade

One page with an asset selector, quoted price, quantity, Buy/Sell buttons, virtual cash, and holdings. New portfolios start with $10,000 in virtual cash. Data stays in the existing browser IndexedDB database.

No chart, navigation, history screen, portfolio tools, profit dashboards, leverage controls, automatic selling, or background price polling. Prices load when selecting an asset or pressing Refresh. Existing stored trade records remain available internally to reconstruct holdings.

## Run

```bash
npm ci
npm run dev
```

BTC/ETH quotes use CoinGecko. AAPL/TSLA quotes require `VITE_FINNHUB_API_KEY` in `.env.local` (see `.env.example`). This is a browser application: that value is visible in the client bundle, not a server secret. Quote errors disable trading until a price is available.

## Check and build

```bash
npm test
npm run lint
npm run build
```

Production files are in `dist`. Keep `Paper-trade-peni667-old` as the hosting build directory.
