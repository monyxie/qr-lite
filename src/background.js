import { apiNs, capturePartialScreen, openPopup, storage, tabs } from './utils/compat'
import { addHistory } from './utils/history'
import { initDecoder, scan } from './utils/qrcode'
import { convertBlobToDataUri, randomStr } from './utils/misc'

/**
 * @type {{action:string}}
 */
let openPopupOptions = null
/**
 * @type {string[]}
 */
let pickerSecrets = []
/**
 * @type {{openUrlMode:'NO_OPEN'|'OPEN'|'OPEN_NEW_BG_TAB'|'OPEN_NEW_FG_TAB'}}
 */
let pickerOptions = null

initDecoder()

function openPopupWithOptions (options) {
  openPopupOptions = options
  openPopup()
}

function openPickerWithOptions (options) {
  pickerOptions = options
  tabs.query({ active: true, currentWindow: true })
    .then(tabs => tabs[0])
    .then(injectPickerLoader)
}

async function captureScan (request) {
  const canvas = await capturePartialScreen(request.rect, request.scroll, request.devicePixelRatio)
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

async function injectPickerLoader (tab) {
  apiNs.scripting.executeScript({
    files: ['content_scripts/picker-loader.js'],
    target: {
      tabId: tab.id
    }
  })
}

function getMenuItems () {
  const items = {
    context_menu_pick_region_to_scan: {
      title: apiNs.i18n.getMessage('context_menu_pick_region_to_scan'),
      contexts: ['page', 'action', 'image', 'video', 'audio'],
      onclick: async function (info, tab) {
        await injectPickerLoader(tab)
      }
    },
    context_menu_make_qr_code_for_selected_text: {
      title: apiNs.i18n.getMessage('context_menu_make_qr_code_for_selected_text'),
      contexts: ['selection'],
      onclick: function (info, tab) {
        openPopupWithOptions({ action: 'POPUP_ENCODE', text: info.selectionText, title: info.selectionText })
      }
    },
    context_menu_make_qr_code_for_link: {
      title: apiNs.i18n.getMessage('context_menu_make_qr_code_for_link'),
      contexts: ['link'],
      onclick: function (info, tab) {
        openPopupWithOptions({ action: 'POPUP_ENCODE', text: info.linkUrl, title: info.linkText })
      }
    },
    context_menu_scan_qr_code_in_image: {
      title: apiNs.i18n.getMessage('context_menu_scan_qr_code_in_image'),
      contexts: ['image'],
      onclick: (info, tab) => {
        openPopupWithOptions({ action: 'POPUP_DECODE', image: info.srcUrl })
      }
    },
    context_menu_scan_with_camera: {
      title: apiNs.i18n.getMessage('context_menu_scan_with_camera'),
      contexts: ['action'],
      onclick: function (info, tab) {
        openPopupWithOptions({ action: 'POPUP_DECODE_CAMERA' })
      }
    }
  }
  return items
}

let menuItems = null
apiNs.runtime.onInstalled.addListener(() => {
  if (!menuItems) menuItems = getMenuItems()
  for (const id in menuItems) {
    if (Object.hasOwnProperty.call(menuItems, id)) {
      const createProperties = Object.assign({}, menuItems[id])
      createProperties.id = id
      delete createProperties.onclick
      apiNs.contextMenus.create(createProperties)
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

apiNs.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'select-region-to-scan':
      openPickerWithOptions({ openUrlMode: 'NO_OPEN' })
      break
    case 'select-region-to-scan-open':
      openPickerWithOptions({ openUrlMode: 'OPEN' })
      break
    case 'select-region-to-scan-open-new-bg-tab':
      openPickerWithOptions({ openUrlMode: 'OPEN_NEW_BG_TAB' })
      break
    case 'select-region-to-scan-open-new-fg-tab':
      openPickerWithOptions({ openUrlMode: 'OPEN_NEW_FG_TAB' })
      break
    case 'scan-with-camera':
      openPopupWithOptions({ action: 'POPUP_DECODE_CAMERA' })
      break
  }
})

function createPickerSecret () {
  const secret = randomStr(16)
  // only keep the latest 10
  pickerSecrets = [...pickerSecrets.slice(-10), secret]
  return secret
}

function validatePickerSecret (secret) {
  const pos = pickerSecrets.indexOf(secret)
  if (pos !== -1) {
    pickerSecrets = [...pickerSecrets.slice(0, pos), ...pickerSecrets.slice(pos + 1)]
    return true
  }
  return false
}

apiNs.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // In firefox we can return a promise but we can't do that in Chrome
  switch (request.action) {
    case 'BG_INJECT_PICKER_LOADER':
      tabs.query({ active: true, currentWindow: true })
        .then(tabs => tabs[0])
        .then(injectPickerLoader)
      break
    // image capturing
    case 'BG_CAPTURE':
      captureScan(request).then(sendResponse)
      return true
    case 'BG_CREATE_TAB':
      tabs.create({ url: request.url, active: request.active, openerTabId: sender.tab?.id }).then(sendResponse)
      return true
    // get popup options
    case 'POPUP_GET_OPTIONS':
      sendResponse(openPopupOptions)
      openPopupOptions = null
      break
    case 'PICKER_GET_OPTIONS':
      sendResponse(pickerOptions)
      pickerOptions = null
      break
    case 'BG_GET_PICKER_URL': {
      const url = new URL(apiNs.runtime.getURL('pages/picker.html'))
      url.searchParams.set('secret', createPickerSecret())
      sendResponse(url.href)
      break
    }
    case 'BG_VALIDATE_PICKER_SECRET':
      sendResponse(validatePickerSecret(request.secret))
      break
    case 'BG_APPLY_CSS':
      if (sender.tab?.id) {
        const promises = []
        if (request.add?.length) {
          promises.push(apiNs.scripting.insertCSS({
            css: request.add,
            origin: 'USER',
            target: {
              tabId: sender.tab.id
            }
          }))
        }
        if (request.remove?.length) {
          promises.push(apiNs.scripting.removeCSS({
            css: request.add,
            origin: 'USER',
            target: {
              tabId: sender.tab.id
            }
          }))
        }
        Promise.all(promises).then(() => sendResponse())
      }
      break
  }
})
