# Paper Trade

A React + Vite application with a compact portfolio view and a separate trade screen. Portfolio data is stored locally in the browser using IndexedDB.

## Interface

- `/dash` shows portfolio totals and open positions.
- Portfolio tools groups the add-cash, import, export, and reset actions in a collapsible section.
- Trade history is collapsible to keep the portfolio view compact.
- `/trade` contains the chart and order form, with optional advanced controls.

Collapsing sections does not delete their data. Reset remains a separate action that requires confirmation. Export creates a JSON backup of the current portfolio.

## Development

```bash
npm ci
npm run dev
```

Market quotes come from CoinGecko and Finnhub. Crypto quotes do not require a key. Stock quotes use `VITE_FINNHUB_API_KEY` from the local environment; `.env.example` lists the available configuration. Local environment files are ignored by Git. Because this is a browser application, Vite environment values are included in the client bundle and are not server-side secrets.

Provider errors are shown in the interface. Failed requests retain the last cached quote, and requests time out after 10 seconds.

## Checks and build

```bash
npm run lint
npm test
npm run build
```

The production output is written to `dist`. Existing hosting setups can continue to use `Paper-trade-peni667-old` as their application directory.
