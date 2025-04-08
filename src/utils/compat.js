import { createCanvasFromDataUri } from './misc'

// eslint-disable-next-line no-undef
export const apiNs = QRLITE_BROWSER === 'firefox' ? browser : chrome
export const tabs = QRLITE_BROWSER === 'firefox'
  ? {
      query: options => {
        return apiNs.tabs.query(options)
      },
      create: options => {
        return apiNs.tabs.create(options)
      }
    }
  : {
      query: options => {
        return new Promise((resolve, reject) => {
          apiNs.tabs.query(options, (data) => {
            resolve(data)
          })
        })
      },
      create: options => {
        return new Promise((resolve, reject) => {
          apiNs.tabs.create(options, (data) => {
            resolve(data)
          })
        })
      }
    }
export const storage = QRLITE_BROWSER === 'firefox'
  ? {
      get: keys => {
        return apiNs.storage.local.get(keys)
      },
      set: keys => {
        return apiNs.storage.local.set(keys)
      }
    }
  : {
      get: keys => {
        return new Promise((resolve, reject) => {
          apiNs.storage.local.get(keys, (data) => {
            resolve(data)
          })
        })
      },
      set: keys => {
        return new Promise((resolve, reject) => {
          apiNs.storage.local.set(keys, (data) => {
            resolve(data)
          })
        })
      }
    }

export const openPopup = (options) => {
  // In Chrome-based browsers, `action.openPopup` is only available to policy installed extensions
  // https://developer.chrome.com/docs/extensions/reference/api/action#method-openPopup
  try {
    return apiNs.action.openPopup(options)
  } catch (e) {
    return apiNs.tabs.create({ url: apiNs.runtime.getURL('/pages/popup.html') })
  }
}

// chrome: https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab
// firefox: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/captureVisibleTab
/**
 * @param rect {{x,y,width,height}}
 * @param scroll {{top,left}}
 * @param devicePixelRatio {number}
 * @return Promise<OffscreenCanvas>
 */
export const capturePartialScreen = QRLITE_BROWSER === 'firefox'
  ? async (rect, scroll, devicePixelRatio) => {
    // in firefox, the '<all_urls>' permission is required to call captureVisibleTab
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1784920
    if (typeof apiNs.tabs.captureVisibleTab !== 'function') {
      throw new Error('Permission not granted')
    }
    return apiNs.tabs.captureVisibleTab({
      format: 'png',
      rect: { x: rect.x + scroll.left, y: rect.y + scroll.top, width: rect.width, height: rect.height }
    })
      .then(dataUri => createCanvasFromDataUri(dataUri))
  }
  : (rect, scroll, devicePixelRatio) => {
      return apiNs.tabs.captureVisibleTab({ format: 'png' })
        .then(dataUrl => createCanvasFromDataUri(dataUrl, {
          x: rect.x * devicePixelRatio,
          y: rect.y * devicePixelRatio,
          width: rect.width * devicePixelRatio,
          height: rect.height * devicePixelRatio
        }))
    }

export const clipboard = QRLITE_BROWSER === 'firefox'
  ? {
      copyPng: (canvas) => {
      // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/clipboard/setImageData
        return new Promise((resolve, reject) => {
          canvas.toBlob(blob => {
            blob.arrayBuffer()
              .then(buf => apiNs.clipboard.setImageData(buf, 'png'))
              .then(resolve)
          }, 'image/png')
        })
      }
    }
  : {
      copyPng: (canvas) => {
      // https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write
        return new Promise((resolve, reject) => {
          canvas.toBlob(blob => {
            navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ])
              .then(resolve)
          }, 'image/png')
        })
      }
    }

export const canOpenShortcutSettings = QRLITE_BROWSER === 'firefox'
  ? () => typeof apiNs.commands.openShortcutSettings === 'function'
  : () => true

export const openShortcutSettings = QRLITE_BROWSER === 'firefox'
  ? async () => {
    if (typeof apiNs.commands.openShortcutSettings === 'function') {
      return apiNs.commands.openShortcutSettings()
    }
  }
  : async () => {
    return tabs.create({ url: 'chrome://extensions/shortcuts', active: true })
  }
