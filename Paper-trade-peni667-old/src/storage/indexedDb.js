const openDatabase = () => new Promise((resolve, reject) => {
  const request = indexedDB.open('paper-trade', 1)
  request.onupgradeneeded = () => request.result.createObjectStore('portfolio')
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
  request.onblocked = () => reject(new Error('Portfolio storage is blocked.'))
})

async function withStore(mode, callback) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('portfolio', mode)
    const request = callback(transaction.objectStore('portfolio'))
    transaction.oncomplete = () => {
      db.close()
      resolve(request.result)
    }
    transaction.onabort = transaction.onerror = () => {
      db.close()
      reject(transaction.error || request.error)
    }
  })
}

export const loadPortfolio = () => withStore('readonly', (store) => store.get('state'))
export const savePortfolio = (state) => withStore('readwrite', (store) => store.put(state, 'state'))
