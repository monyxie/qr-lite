(function(browser){
    function renderQrCode(str) {
        var sourceStrElement = document.getElementById('sourceStr');
        var resultElement = document.getElementById('result');
        sourceStrElement.innerText = str;
        new QRCode(resultElement, str);
    }

    var str = decodeURIComponent(window.location.hash.substring(1));
    if (str) {
        renderQrCode(str);
        return;
    }

    browser.tabs.query({active: true, currentWindow: true}).then(function(tabs){
        renderQrCode(tabs[0].url);
    })
})(browser);
