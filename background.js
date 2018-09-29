/**
 * Listens for the app launching, then creates the window.
 *
 * @see https://developer.mozilla.org/it/Add-ons/WebExtensions
 */

browser.browserAction.onClicked.addListener(function(activeTab){
  var newURL = "data/index.html"; // get qr code
  browser.tabs.create({ url: newURL });
});

function onSelectTxt(info, tab) {
  var qrURL = "data/index.html#" + encodeURIComponent(info.selectionText);
  browser.tabs.create({ url: qrURL });
}
function onGetLink(info, tab) {
  var qrURL = "data/index.html#" + encodeURIComponent(info.linkUrl);
  browser.tabs.create({ url: qrURL });
}

function onGetPage(info, tab) {
  var qrURL = "data/index.html#" + encodeURIComponent(tab.url);
  browser.tabs.create({ url: qrURL });
}
function decodeQR(info, tab){
	var urlDecode = "https://zxing.org/w/decode?u=" + encodeURIComponent(info.srcUrl);
	browser.tabs.create({ url: urlDecode });
}

function decodeQRcode() {
	browser.contextMenus.create({
      "title": "Decode this QR Code",
      "contexts": ["image"],
      "onclick" : decodeQR
    });
}
function txtQR() {
  browser.contextMenus.create({
      "title": "Text to QR-Code",
      "contexts": ["selection"],
      "onclick" : onSelectTxt
    });
}

function linkQR() {
  browser.contextMenus.create({
      "title": "Link to QR-Code",
      "contexts": ["link"],
      "onclick" : onGetLink
    });
}

function urlpage(){
  browser.contextMenus.create({
      "title": "URL page to QR Code",
      "contexts": ["page"],
      "onclick" : onGetPage
    });
}


urlpage();
linkQR();
txtQR();
decodeQRcode();
