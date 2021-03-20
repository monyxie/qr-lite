/**
 * Listens for the app launching, then creates the window.
 *
 * @see https://developer.mozilla.org/it/Add-ons/WebExtensions
 */

(function(browser) {
    function openMainPageWithString(str) {
        window.stringToEncode = str
        browser.browserAction.openPopup()
    }

    browser.browserAction.onClicked.addListener(function (tab) {
        openMainPageWithString(tab.url);
    });

    browser.contextMenus.create({
        "title": "Encode Selected Text",
        "contexts": ["selection"],
        "onclick": function onSelectTxt(info, tab) {
            openMainPageWithString(info.selectionText);
        }
    });

    browser.contextMenus.create({
        "title": "Encode Link URL",
        "contexts": ["link"],
        "onclick": function onGetLink(info, tab) {
            openMainPageWithString(info.linkUrl);
        }

    });

    // decode QR code in image
    browser.contextMenus.create({
        "title": "Decode this image",
        "contexts": ["image"],
        "onclick": function decodeQR(info, tab) {
            const urlDecode = "https://zxing.org/w/decode?u=" + encodeURIComponent(info.srcUrl);
            browser.tabs.create({url: urlDecode});
        }
    });

})(browser);

