// eslint-disable-next-line no-undef
const browser = process.argv[2];

if (["firefox", "chrome"].indexOf(browser) === -1) {
  throw new Error("Unknown browser: " + browser);
}

const manifest = {
  manifest_version: 3,
  name: "__MSG_extension_name__",
  short_name: "__MSG_extension_short_name__",
  description: "__MSG_extension_description__",
  version: "3.4.0",
  default_locale: "en",
  icons:
    browser === "firefox"
      ? {
          16: "icons/qrlite.svg",
          48: "icons/qrlite.svg",
        }
      : {
          16: "icons/qrlite-16.png",
          32: "icons/qrlite-32.png",
          48: "icons/qrlite-48.png",
          128: "icons/qrlite-128.png",
        },
  browser_specific_settings: {
    gecko: {
      id: "@qrlite",
      strict_min_version: "126.0",
    },
  },
  permissions: [
    "activeTab",
    // MDN states that "contextMenus"  is an alias for "menus"
    // but in order to get OnClickData.targetElementId and use menus.getTargetElement()
    // we *have to* use "menus" here and use browser.menus to call the API
    browser === "firefox" ? "menus" : "contextMenus",
    "storage",
    "clipboardWrite",
    "scripting",
  ],
  action: {
    default_icon:
      browser === "firefox"
        ? "icons/qrlite.svg"
        : {
            16: "icons/qrlite-16.png",
            32: "icons/qrlite-32.png",
            48: "icons/qrlite-48.png",
            128: "icons/qrlite-128.png",
          },
    default_popup: "pages/popup.html",
  },
  content_security_policy: {
    extension_pages:
      [
        "script-src 'self' 'wasm-unsafe-eval'",
        "default-src 'self'",
        // "connect-src http:" is for `fetch()`ing HTTP images in popup to avoid Mixed Content blocking
        // chrome doesn't need it
        browser === "firefox"
          ? "connect-src 'self' data: http:"
          : "connect-src 'self' data:",
        "img-src * data: blob:",
        "style-src 'self'",
        // "data:" for loading audio via dataURL to workaround https://bugzilla.mozilla.org/show_bug.cgi?id=1965971
        "media-src 'self' data:",
      ].join("; ") + ";",
  },
  background:
    browser === "firefox"
      ? {
          scripts: ["background.js"],
        }
      : {
          service_worker: "background.js",
        },
  commands: {
    _execute_action: {
      description: "__MSG_browser_action_command_description__",
    },
    "select-region-to-scan": {
      description: "__MSG_select_region_to_scan_command_description__",
    },
    "select-region-to-scan-open": {
      description: "__MSG_select_region_to_scan_open_command_description__",
    },
    "select-region-to-scan-open-new-bg-tab": {
      description:
        "__MSG_select_region_to_scan_open_new_bg_tab_command_description__",
    },
    "select-region-to-scan-open-new-fg-tab": {
      description:
        "__MSG_select_region_to_scan_open_new_fg_tab_command_description__",
    },
    "scan-with-camera": {
      description: "__MSG_scan_with_camera_command_description__",
    },
  },
  web_accessible_resources: [
    {
      resources: ["pages/picker.html"],
      matches: ["<all_urls>"],
      ...(browser === "firefox" ? {} : { use_dynamic_url: true }),
    },
  ],
  options_ui: {
    page: "pages/settings.html?minimal=true",
  },
};

console.log(JSON.stringify(manifest, null, 2));
