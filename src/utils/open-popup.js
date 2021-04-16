const openPopupFirefox = () => window.browser.browserAction.openPopup()

const openPopupChrome = () => {
  return new Promise((resolve, reject) => {
    window.chrome.browserAction.openPopup((data) => {
      resolve(data)
    })
  })
}

export default QRLITE_BROWSER === 'chrome' ? openPopupChrome : openPopupFirefox