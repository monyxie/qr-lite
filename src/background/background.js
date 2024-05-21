import { apiNs, captureScreen, openPopup } from '../utils/compat'
import { addHistory } from '../utils/history'
import { initDecoder, scan } from '../utils/qrcode'
import { convertBlobToDataUri } from '../utils/misc'

let openPopupOptions = null

if (typeof importScripts === 'function') {
  // dynamic imports don't work in web workers, we have to use importScripts to load opencv
  // this has to be at the top level
  // globalThis.cv will be assigned the opencv.js instance
  // eslint-disable-next-line no-undef
  importScripts('../opencv/opencv.js')
  initDecoder(globalThis.cv)
}

function openPopupWithOptions (options) {
  openPopupOptions = options
  openPopup()
}

async function captureScan (request) {
  const canvas = await captureScreen(request.rect, request.scroll, request.devicePixelRatio)
  const ctx = canvas.getContext('2d')
  const dataUri = canvas.convertToBlob({ type: 'image/png' }).then(convertBlobToDataUri)

  try {
    const result = await scan(ctx.getImageData(0, 0, canvas.width, canvas.height))
    if (result.length) {
      await addHistory('decode', result[0].content)
    }
    return {
      image: await dataUri,
      result
    }
  } catch (err) {
    console.error('err', err)
    return {
      image: await dataUri,
      err
    }
  }
}

function getMenuItems () {
  return {
    context_menu_make_qr_code_for_selected_text: {
      title: apiNs.i18n.getMessage('context_menu_make_qr_code_for_selected_text'),
      contexts: ['selection'],
      onclick: function (info, tab) {
        openPopupWithOptions({ action: 'ACTION_ENCODE', text: info.selectionText, title: info.selectionText })
      }
    },
    context_menu_make_qr_code_for_link: {
      title: apiNs.i18n.getMessage('context_menu_make_qr_code_for_link'),
      contexts: ['link'],
      onclick: function (info, tab) {
        openPopupWithOptions({ action: 'ACTION_ENCODE', text: info.linkUrl, title: info.linkText })
      }
    },
    context_menu_scan_qr_code_in_image: {
      title: apiNs.i18n.getMessage('context_menu_scan_qr_code_in_image'),
      contexts: ['image'],
      onclick: function (info, tab) {
        openPopupWithOptions({ action: 'ACTION_DECODE', image: info.srcUrl })
      }
    },
    context_menu_pick_region_to_scan: {
      title: apiNs.i18n.getMessage('context_menu_pick_region_to_scan'),
      contexts: ['page', 'action'],
      onclick: async function (info, tab) {
        // in firefox, the '<all_urls>' permission is required to call captureVisibleTab
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1784920
        if (typeof apiNs.tabs.captureVisibleTab !== 'function') {
          const res = await apiNs.permissions.request({ origins: ['<all_urls>'] })
          if (!res) {
            throw new Error('Permission not granted')
          }
        }

        apiNs.scripting.executeScript({
          files: ['content_scripts/scan_region_picker.js'],
          target: {
            tabId: tab.id
          }
        })
      }
    },
    context_menu_scan_with_camera: {
      title: apiNs.i18n.getMessage('context_menu_scan_with_camera'),
      contexts: ['action'],
      onclick: function (info, tab) {
        openPopupWithOptions({ action: 'ACTION_DECODE_CAMERA' })
      }
    }
  }
}

let menuItems = null
apiNs.runtime.onInstalled.addListener(() => {
  if (!menuItems) menuItems = getMenuItems()
  for (const id in menuItems) {
    if (Object.hasOwnProperty.call(menuItems, id)) {
      apiNs.contextMenus.create({
        id,
        title: menuItems[id].title,
        contexts: menuItems[id].contexts
      })
    }
  }
})

apiNs.contextMenus.onClicked.addListener((info, tab) => {
  // info: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus/OnClickData
  // tab: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/Tab
  if (!menuItems) menuItems = getMenuItems()
  if (info.menuItemId && menuItems[info.menuItemId]) {
    menuItems[info.menuItemId].onclick.call(this, info, tab)
  }
})

apiNs.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // In firefox we can return a promise but we can't do that in Chrome
  switch (request.action) {
    // image capturing
    case 'ACTION_CAPTURE':
      captureScan(request).then(sendResponse)
      return true
    // get popup options
    case 'ACTION_GET_POPUP_OPTIONS':
      sendResponse(openPopupOptions)
      openPopupOptions = null
      break
  }
})
