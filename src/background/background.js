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
    openPopup({ action: 'ACTION_ENCODE', text: tab.url, title: tab.title })
  })

  browser.contextMenus.create({
    title: browser.i18n.getMessage('context_menu_make_qr_code_for_selected_text'),
    contexts: ['selection'],
    onclick: function onSelectTxt (info, tab) {
      openPopup({ action: 'ACTION_ENCODE', text: info.selectionText, title: info.selectionText })
    }
  })

  browser.contextMenus.create({
    title: browser.i18n.getMessage('context_menu_make_qr_code_for_link'),
    contexts: ['link'],
    onclick: function onGetLink (info, tab) {
      openPopup({ action: 'ACTION_ENCODE', text: info.linkUrl, title: info.linkText })
    }

  })

  // decode QR code in image
  browser.contextMenus.create({
    title: browser.i18n.getMessage('context_menu_scan_qr_code_in_image'),
    contexts: ['image'],
    onclick: function decodeQR (info, tab) {
      openPopup({ action: 'ACTION_DECODE', image: info.srcUrl })
    }
  })
})(window.browser)
