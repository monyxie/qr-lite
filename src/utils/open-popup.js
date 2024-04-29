const openPopupFirefox = (options) => window.browser.action.openPopup(options)

const openPopupChrome = (options) => {
  return new Promise((resolve, reject) => {
    window.chrome.action.openPopup(options, (data) => {
      resolve(data)
    })
  })
}

export const openPopup = QRLITE_BROWSER === 'chrome' ? openPopupChrome : openPopupFirefox
