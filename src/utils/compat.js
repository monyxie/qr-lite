import { createCanvasFromDataUri } from "./misc";

// eslint-disable-next-line no-undef
export const apiNs = QRLITE_BROWSER === "firefox" ? browser : chrome;
export const tabs =
  QRLITE_BROWSER === "firefox"
    ? {
        query: (options) => {
          return apiNs.tabs.query(options);
        },
        create: (options) => {
          return apiNs.tabs.create(options);
        },
        getCurrent: () => {
          return apiNs.tabs.getCurrent();
        },
      }
    : {
        query: (options) => {
          return new Promise((resolve) => {
            apiNs.tabs.query(options, (data) => {
              resolve(data);
            });
          });
        },
        create: (options) => {
          return new Promise((resolve) => {
            apiNs.tabs.create(options, (data) => {
              resolve(data);
            });
          });
        },
        getCurrent: () => {
          return apiNs.tabs.getCurrent();
        },
      };
export const storage =
  QRLITE_BROWSER === "firefox"
    ? (area) => ({
        get: (keys) => {
          return apiNs.storage[area].get(keys);
        },
        set: (keys) => {
          return apiNs.storage[area].set(keys);
        },
      })
    : (area) => ({
        get: (keys) => {
          return new Promise((resolve) => {
            apiNs.storage[area].get(keys, (data) => {
              resolve(data);
            });
          });
        },
        set: (keys) => {
          return new Promise((resolve) => {
            apiNs.storage[area].set(keys, (data) => {
              resolve(data);
            });
          });
        },
      });

export const openPopup = (options) => {
  // Between Chrome 118 and Chrome 126 (October 2023 - June 2024), `action.openPopup()` is only available to policy installed extensions
  // https://developer.chrome.com/docs/extensions/reference/api/action#method-openPopup
  try {
    return apiNs.action.openPopup(options);
  } catch {
    return apiNs.tabs.create({
      url: apiNs.runtime.getURL("/pages/popup.html"),
    });
  }
};

// chrome: https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab
// firefox: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/captureVisibleTab
/**
 * @param rect {{x,y,width,height}}
 * @param scroll {{top,left}}
 * @param devicePixelRatio {number}
 * @return Promise<OffscreenCanvas>
 */
export const capturePartialScreen =
  QRLITE_BROWSER === "firefox"
    ? async (rect, scroll) => {
        return apiNs.tabs
          .captureVisibleTab({
            format: "png",
            rect: {
              x: rect.x + scroll.left,
              y: rect.y + scroll.top,
              width: rect.width,
              height: rect.height,
            },
          })
          .then((dataUri) => createCanvasFromDataUri(dataUri));
      }
    : (rect, scroll, devicePixelRatio) => {
        return apiNs.tabs.captureVisibleTab({ format: "png" }).then((dataUrl) =>
          createCanvasFromDataUri(dataUrl, {
            x: rect.x * devicePixelRatio,
            y: rect.y * devicePixelRatio,
            width: rect.width * devicePixelRatio,
            height: rect.height * devicePixelRatio,
          })
        );
      };

export const clipboard =
  QRLITE_BROWSER === "firefox"
    ? {
        copyPng: (canvas) => {
          // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/clipboard/setImageData
          return new Promise((resolve) => {
            canvas.toBlob((blob) => {
              blob
                .arrayBuffer()
                .then((buf) => apiNs.clipboard.setImageData(buf, "png"))
                .then(resolve);
            }, "image/png");
          });
        },
      }
    : {
        copyPng: (canvas) => {
          // https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write
          return new Promise((resolve) => {
            canvas.toBlob((blob) => {
              navigator.clipboard
                .write([new ClipboardItem({ "image/png": blob })])
                .then(resolve);
            }, "image/png");
          });
        },
      };

export const canOpenShortcutSettings =
  QRLITE_BROWSER === "firefox"
    ? () => typeof apiNs.commands.openShortcutSettings === "function"
    : () => true;

export const openShortcutSettings =
  QRLITE_BROWSER === "firefox"
    ? async () => {
        if (typeof apiNs.commands.openShortcutSettings === "function") {
          return apiNs.commands.openShortcutSettings();
        }
      }
    : async () => {
        return tabs.create({
          url: "chrome://extensions/shortcuts",
          active: true,
        });
      };
