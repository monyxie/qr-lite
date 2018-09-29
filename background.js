/**
 * Listens for the app launching, then creates the window.
 *
 * @see https://developer.mozilla.org/it/Add-ons/WebExtensions
 */

(function(browser) {
    function openMainPageWithString(str) {
        var qrURL = "data/index.html#" + encodeURIComponent(str);
        browser.tabs.create({url: qrURL});
    }

    browser.browserAction.onClicked.addListener(function (tab) {
        openMainPageWithString(tab.url);
    });

    browser.contextMenus.create({
        "title": "Text to QR-Code",
        "contexts": ["selection"],
        "onclick": function onSelectTxt(info, tab) {
            openMainPageWithString(info.selectionText);
        }
    });

    browser.contextMenus.create({
        "title": "Link to QR-Code",
        "contexts": ["link"],
        "onclick": function onGetLink(info, tab) {
            openMainPageWithString(info.linkUrl);
        }

    });

    browser.contextMenus.create({
        "title": "URL page to QR Code",
        "contexts": ["page"],
        "onclick": function onGetPage(info, tab) {
            openMainPageWithString(tab.url);
        }
    });

    // decode QR code in image
    browser.contextMenus.create({
        "title": "Decode this QR Code",
        "contexts": ["image"],
        "onclick": function decodeQR(info, tab) {
            var urlDecode = "https://zxing.org/w/decode?u=" + encodeURIComponent(info.srcUrl);
            browser.tabs.create({url: urlDecode});
        }
    });

})(browser || chrome);

