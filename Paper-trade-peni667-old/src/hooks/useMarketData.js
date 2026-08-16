// Re-export from market module for backward compatibility
export { useMarketStore as useMarketData } from '../market/store'
export { SUPPORTED_SYMBOLS } from '../market/providers'
export { registerSymbol } from '../market/resolver'
export { registerProvider } from '../market/registry'
export { configureCoinGecko, configureFinnhub } from '../market/providers'
export {
  createInstrument,
  createRawPrice,
  createPricingModel,
  ASSET_CLASSES,
  INSTRUMENT_TYPES,
  PRICING_TYPES,
} from '../market/types'
export { resolvePricingModel, normalizePrice } from '../market/pricing'
export { calculateRealizedPnl } from '../engine/tradingEngine'
