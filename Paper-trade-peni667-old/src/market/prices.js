export const SYMBOLS = ['BTC-USD', 'ETH-USD', 'AAPL', 'TSLA']

export async function fetchPrice(symbol, {
  signal,
  fetch = globalThis.fetch,
  apiKey = import.meta.env?.VITE_FINNHUB_API_KEY || '',
} = {}) {
  if (!SYMBOLS.includes(symbol)) throw new Error('Unsupported symbol')

  const coin = { 'BTC-USD': 'bitcoin', 'ETH-USD': 'ethereum' }[symbol]
  if (!coin && !apiKey.trim()) throw new Error('Stock quotes are not configured')

  const query = new URLSearchParams(coin
    ? { ids: coin, vs_currencies: 'usd' }
    : { symbol, token: apiKey.trim() })
  const endpoint = coin
    ? 'https://api.coingecko.com/api/v3/simple/price'
    : 'https://finnhub.io/api/v1/quote'
  const controller = new AbortController()
  const cancel = () => controller.abort(signal.reason)
  if (signal?.aborted) cancel()
  else signal?.addEventListener('abort', cancel, { once: true })
  const timer = setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(`${endpoint}?${query}`, { signal: controller.signal })
    if (!response.ok) throw new Error(`Quote request failed (${response.status})`)
    const data = await response.json()
    const price = coin ? data?.[coin]?.usd : data?.c
    if (!Number.isFinite(price) || price <= 0) throw new Error('No valid price available')
    return price
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
  }
}
