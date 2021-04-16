const StorageFirefox = {
  get: keys => {
    return window.browser.storage.local.get(keys)
  },
  set: keys => {
    return window.browser.storage.local.set(keys)
  }
}

const StorageChrome = {
  get: keys => {
    return new Promise((resolve, reject) => {
      window.chrome.storage.local.get(keys, (data) => {
        resolve(data)
      })
    })
  },
  set: keys => {
    return new Promise((resolve, reject) => {
      window.chrome.storage.local.set(keys, (data) => {
        resolve(data)
      })
    })
  }
}

export default QRLITE_BROWSER === 'chrome' ? StorageChrome : StorageFirefox