import { openPopup } from '../utils/open-popup'
import { scan } from '../qr-scanner-wechat/index.mjs'
import { addHistory } from '../utils/history'

class Background {
  constructor (browser, navigator) {
    this.browser = browser
    this.navigator = navigator
  }

  openPopup (options) {
    window.qrLitePopupOptions = options
    openPopup().then(function () {
    })
  }

  async captureScan (request) {
    const dataUri = await this.browser.tabs.captureVisibleTab({
      rect: request.rect
    })

    const img = document.createElement('img')
    img.src = dataUri
    await img.decode()
    try {
      const result = await scan(img)
      if (typeof result.text === 'undefined') {
        throw new Error('empty result from decoder')
      }
      await addHistory('decode', result.text)
      return {
        image: dataUri,
        result
      }
    } catch (err) {
      return {
        image: dataUri,
        err
      }
    }
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
      onclick: function (info, tab) {
        that.openPopup({ action: 'ACTION_DECODE', image: info.srcUrl })
      }
    })

    if (QRLITE_BROWSER === 'firefox') {
      this.browser.contextMenus.create({
        title: this.browser.i18n.getMessage('context_menu_pick_region_to_scan'),
        contexts: ['page', 'browser_action'],
        onclick: function (info, tab) {
          that.browser.tabs.executeScript({
            file: '../content_scripts/scan_region_picker.js'
          })
        }
      })

      this.browser.contextMenus.create({
        title: this.browser.i18n.getMessage('context_menu_scan_with_camera'),
        contexts: ['browser_action'],
        onclick: function (info, tab) {
          that.openPopup({ action: 'ACTION_DECODE_CAMERA' })
        }
      })

      this.browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
          // image capturing
          case 'ACTION_CAPTURE':
            return that.captureScan(request)
          // copy to clipboard
          case 'ACTION_COPY_TEXT':
            return that.navigator.clipboard.writeText(request.text || '')
        }
      })
    }
  }
}

(new Background(window.browser || window.chrome, window.navigator)).init()
