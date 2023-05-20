const TabsFirefox = {
  query: options => {
    return window.browser.tabs.query(options)
  },
  create: options => {
    return window.browser.tabs.create(options)
  }
}

const TabsChrome = {
  query: options => {
    return new Promise((resolve, reject) => {
      window.chrome.tabs.query(options, (data) => {
        resolve(data)
      })
    })
  },
  create: options => {
    return new Promise((resolve, reject) => {
      window.chrome.tabs.query(options, (data) => {
        resolve(data)
      })
    })
  }
}

export default QRLITE_BROWSER === 'chrome' ? TabsChrome : TabsFirefox
