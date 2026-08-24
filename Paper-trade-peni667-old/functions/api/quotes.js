const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.-]{0,9}$/
const MAX_SYMBOLS = 20

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store',
    },
  })
}

function parseCsv(csv) {
  const rows = csv.trim().split(/\r?\n/)
  if (rows.length < 2) return null
  const headers = rows[0].split(',').map((value) => value.toLowerCase())
  const values = rows[1].split(',')
  const record = Object.fromEntries(headers.map((header, index) => [header, values[index]]))
  const price = Number(record.close)
  if (!Number.isFinite(price) || price <= 0 || record.close === 'N/D') return null
  const timestamp = Date.parse(`${record.date}T${record.time || '00:00:00'}Z`)
  return { price, timestamp: Number.isFinite(timestamp) ? timestamp : Date.now() }
}

export async function onRequestGet(context) {
  const requested = new URL(context.request.url).searchParams.get('symbols') || ''
  const symbols = [...new Set(requested.toUpperCase().split(',').filter(Boolean))]
  if (!symbols.length || symbols.length > MAX_SYMBOLS || symbols.some((symbol) => !SYMBOL_PATTERN.test(symbol))) {
    return json({ error: 'Provide 1-20 valid comma-separated symbols.' }, 400)
  }

  const fetchImpl = context.data?.fetch || fetch
  const settled = await Promise.allSettled(symbols.map(async (symbol) => {
    const stooqSymbol = `${symbol.toLowerCase()}.us`
    const query = new URLSearchParams({ s: stooqSymbol, f: 'sd2t2ohlcv', h: '', e: 'csv' })
    const response = await fetchImpl(`https://stooq.com/q/l/?${query}`)
    if (!response.ok) throw new Error(`Stooq HTTP ${response.status}`)
    return [symbol, parseCsv(await response.text())]
  }))

  const quotes = {}
  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value[1]) quotes[result.value[0]] = result.value[1]
  }
  if (!Object.keys(quotes).length && settled.every((result) => result.status === 'rejected')) {
    return json({ error: 'The free quote service is temporarily unavailable.' }, 502)
  }
  return json({ quotes })
}
