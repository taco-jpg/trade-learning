const DB_NAME = 'paper-trade'
const STORE_NAME = 'portfolio'
const KEY_NAME = 'state'

const openDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const withStore = async (mode, callback) => {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (handler, value) => {
      if (settled) return
      settled = true
      handler(value)
    }
    const transaction = db.transaction(STORE_NAME, mode)
    transaction.oncomplete = () => db.close()
    transaction.onerror = () => {
      finish(reject, transaction.error)
      db.close()
    }
    const store = transaction.objectStore(STORE_NAME)
    const request = callback(store)
    request.onsuccess = () => finish(resolve, request.result)
    request.onerror = () => finish(reject, request.error)
  })
}

export const loadPortfolio = async () => withStore('readonly', (store) => store.get(KEY_NAME))

export const savePortfolio = async (state) =>
  withStore('readwrite', (store) => store.put(state, KEY_NAME))

export const clearPortfolio = async () =>
  withStore('readwrite', (store) => store.clear())
