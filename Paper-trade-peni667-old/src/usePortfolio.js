import { useEffect, useMemo, useRef, useState } from 'react'
import { buildPositionsFromHistory, defaultState, executeTrade, normalizeState } from './engine/tradingEngine'
import { loadPortfolio, savePortfolio } from './storage/indexedDb'

export function usePortfolio() {
  const [state, setState] = useState(defaultState)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const current = useRef(defaultState)
  const saves = useRef(Promise.resolve())

  useEffect(() => {
    let active = true
    loadPortfolio().then((saved) => {
      if (!active) return
      current.current = normalizeState(saved)
      setState(current.current)
      setReady(true)
    }).catch(() => {
      if (active) setError('Could not load saved holdings. Reload to try again.')
    })
    return () => { active = false }
  }, [])

  function trade(action, order) {
    if (!ready) return false
    const result = executeTrade(current.current, action, order)
    if (result.error) {
      setError(result.error)
      return false
    }
    current.current = result.state
    setState(result.state)
    setError('')
    saves.current = saves.current.then(() => savePortfolio(result.state)).catch(() => {
      setError('Could not save this trade. Changes in this tab may be lost.')
    })
    return true
  }

  const positions = useMemo(() => buildPositionsFromHistory(state.history), [state.history])
  return { state, positions, ready, error, trade }
}
