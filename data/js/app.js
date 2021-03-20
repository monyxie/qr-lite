(function(browser, chrome){
    let qrCode = null;
    const domSource = document.getElementById('sourceInput');
    const domCounter = document.getElementById('counter');
    const domResult = document.getElementById('result');

    function renderQrCode(str) {
        domSource.innerText = str;
        domCounter.innerText = '' + str.length + ' character(s)';
        if (qrCode) {
            qrCode.makeCode(str)
        }
        else {
            qrCode = new QRCode(domResult, {
                text: str,
                width: 300,
                height: 300,
            });
        }
    }

    chrome.runtime.getBackgroundPage((backgroundPage) => {
        if (backgroundPage && backgroundPage.stringToEncode) {
            renderQrCode(backgroundPage.stringToEncode);
            backgroundPage.stringToEncode = null
        }
        else {
            browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs){
                renderQrCode(tabs[0].url);
            })
        }
    });

    domSource.addEventListener('keyup', function(e){
        renderQrCode(e.target.value)
    })
})(browser, chrome);
