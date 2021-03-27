/**
 * Listens for the app launching, then creates the window.
 *
 * @see https://developer.mozilla.org/it/Add-ons/WebExtensions
 */

(function (browser) {
  function openPopup (options) {
    window.qrLitePopupOptions = options
    browser.browserAction.openPopup().then(function () {

    })
  }

  browser.browserAction.onClicked.addListener(function (tab) {
    openPopup({ action: 'ACTION_ENCODE', text: tab.url })
  })

  browser.contextMenus.create({
    title: 'Make QR Code For Selected Text',
    contexts: ['selection'],
    onclick: function onSelectTxt (info, tab) {
      openPopup({ action: 'ACTION_ENCODE', text: info.selectionText })
    }
  })

  browser.contextMenus.create({
    title: 'Make QR Code For This Link',
    contexts: ['link'],
    onclick: function onGetLink (info, tab) {
      openPopup({ action: 'ACTION_ENCODE', text: info.linkUrl })
    }

  })

  // decode QR code in image
  browser.contextMenus.create({
    title: 'Scan QR Code In This Image',
    contexts: ['image'],
    onclick: function decodeQR (info, tab) {
      openPopup({ action: 'ACTION_DECODE', image: info.srcUrl })
    }
  })
})(window.browser)
