import openPopup from '../utils/open-popup'

class Background {
  constructor (browser) {
    this.browser = browser
  }

  openPopup (options) {
    window.qrLitePopupOptions = options
    openPopup().then(function () {
    })
  }

  init () {
    const that = this
    this.browser.contextMenus.create({
      title: this.browser.i18n.getMessage('context_menu_make_qr_code_for_selected_text'),
      contexts: ['selection'],
      onclick: function onSelectTxt (info, tab) {
        that.openPopup({ action: 'ACTION_ENCODE', text: info.selectionText, title: info.selectionText })
      }
    })

    this.browser.contextMenus.create({
      title: this.browser.i18n.getMessage('context_menu_make_qr_code_for_link'),
      contexts: ['link'],
      onclick: function onGetLink (info, tab) {
        that.openPopup({ action: 'ACTION_ENCODE', text: info.linkUrl, title: info.linkText })
      }

    })

    // decode QR code in image
    this.browser.contextMenus.create({
      title: this.browser.i18n.getMessage('context_menu_scan_qr_code_in_image'),
      contexts: ['image'],
      onclick: function decodeQR (info, tab) {
        that.openPopup({ action: 'ACTION_DECODE', image: info.srcUrl })
      }
    })

    if (QRLITE_BROWSER === 'firefox') {
      // manually pick region to scan
      this.browser.contextMenus.create({
        title: this.browser.i18n.getMessage('context_menu_pick_region_to_scan'),
        contexts: ['page', 'browser_action'],
        onclick: function decodeQR (info, tab) {
          that.browser.tabs.executeScript({
            file: '../content_scripts/scan_region_picker.js'
          })
        }
      })

      // image capturing
      this.browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
          case 'ACTION_CAPTURE':
            return that.browser.tabs.captureVisibleTab({
              rect: request.rect
            }).then((dataUri) => {
              return { dataUri }
            })
        }
      })
    }
  }
}

(new Background(window.browser || window.chrome)).init()
