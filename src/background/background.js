import { openPopup as _openPopup } from '../utils/open-popup'
import { addHistory } from '../utils/history'
import { scan } from '../utils/qrcode'

function openPopup (options) {
  window.qrLitePopupOptions = options
  _openPopup().then(function () {
  })
}

async function captureScan (request) {
  const dataUri = await window.browser.tabs.captureVisibleTab({
    rect: request.rect
  })

  const img = document.createElement('img')
  img.src = dataUri
  await img.decode()
  try {
    const result = await scan(img)
    if (result.length) {
      await addHistory('decode', result[0].content)
    }
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

function getMenuItems () {
  return {
    context_menu_make_qr_code_for_selected_text: {
      title: window.browser.i18n.getMessage('context_menu_make_qr_code_for_selected_text'),
      contexts: ['selection'],
      onclick: function (info, tab) {
        openPopup({ action: 'ACTION_ENCODE', text: info.selectionText, title: info.selectionText })
      }
    },
    context_menu_make_qr_code_for_link: {
      title: window.browser.i18n.getMessage('context_menu_make_qr_code_for_link'),
      contexts: ['link'],
      onclick: function (info, tab) {
        openPopup({ action: 'ACTION_ENCODE', text: info.linkUrl, title: info.linkText })
      }
    },
    context_menu_scan_qr_code_in_image: {
      title: window.browser.i18n.getMessage('context_menu_scan_qr_code_in_image'),
      contexts: ['image'],
      onclick: function (info, tab) {
        openPopup({ action: 'ACTION_DECODE', image: info.srcUrl })
      }
    },
    context_menu_pick_region_to_scan: {
      title: window.browser.i18n.getMessage('context_menu_pick_region_to_scan'),
      contexts: ['page', 'action'],
      onclick: function (info, tab) {
        window.browser.scripting.executeScript({
          file: '../content_scripts/scan_region_picker.js',
          tabId: tab.id
        })
      }
    },
    context_menu_scan_with_camera: {
      title: window.browser.i18n.getMessage('context_menu_scan_with_camera'),
      contexts: ['action'],
      onclick: function (info, tab) {
        openPopup({ action: 'ACTION_DECODE_CAMERA' })
      }
    }
  }
}

let menuItems = null
window.browser.runtime.onInstalled.addListener(() => {
  if (!menuItems) menuItems = getMenuItems()
  for (const id in menuItems) {
    if (Object.hasOwnProperty.call(menuItems, id)) {
      window.browser.contextMenus.create({
        id,
        title: menuItems[id].title,
        contexts: menuItems[id].contexts
      })
    }
  }
})

window.browser.contextMenus.onClicked.addListener((info, tab) => {
  // info: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus/OnClickData
  // tab: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/Tab
  if (!menuItems) menuItems = getMenuItems()
  if (info.menuItemId && menuItems[info.menuItemId]) {
    menuItems[info.menuItemId].onclick.call(this, info, tab)
  }
})

window.browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    // image capturing
    case 'ACTION_CAPTURE':
      return captureScan(request)
    // copy to clipboard
    case 'ACTION_COPY_TEXT':
      return window.navigator.clipboard.writeText(request.text || '')
  }
})
