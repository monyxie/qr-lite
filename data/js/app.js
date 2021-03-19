(function(browser){
    var qrCode = null;

    function renderQrCode(str) {
        var sourceInput = document.getElementById('sourceInput');
        var counter = document.getElementById('counter');
        var resultElement = document.getElementById('result');
        sourceInput.innerText = str;
        counter.innerText = '' + str.length + ' character(s)';
        if (qrCode) {
            qrCode.makeCode(str)
        }
        else {
            qrCode = new QRCode(resultElement, {
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

    document.getElementById('sourceInput').addEventListener('keyup', function(e){
        renderQrCode(e.target.value)
    })
})(browser);
