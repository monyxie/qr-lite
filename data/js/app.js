(function (browser, chrome) {
  let qrCode = null;
  let ecLevel = QRCode.CorrectLevel.M;

  const domSource = document.getElementById('sourceInput');
  const domCounter = document.getElementById('counter');
  const domResult = document.getElementById('result');
  const domEcLevels = document.getElementById('ecLevels');

  function updateActiveEcLevel() {
    domEcLevels.querySelectorAll('.ec-level').forEach(function (el) {
      el.classList.remove('ec-level-active')
    })
    let id = '';
    switch (ecLevel) {
      case QRCode.CorrectLevel.L:
        id = 'ecL';
        break;
      case QRCode.CorrectLevel.M:
        id = 'ecM';
        break;
      case QRCode.CorrectLevel.Q:
        id = 'ecQ';
        break;
      case QRCode.CorrectLevel.H:
        id = 'ecH';
        break;
      default:
        return;
    }
    document.getElementById(id).classList.add('ec-level-active')
  }

  function createQrCode(str) {
    if (typeof str === 'undefined') {
      str = domSource.value;
    } else {
      domSource.value = str;
    }

    domCounter.innerText = '' + str.length;
    updateActiveEcLevel();

    console.log('create QR code for: ' + str)
    console.log('correction Level: ' + ecLevel)

    if (qrCode) {
      qrCode.makeCode(str, ecLevel)
    } else {
      qrCode = new QRCode(domResult, {
        text: str,
        width: 300,
        height: 300,
        correctLevel: ecLevel
      });
    }
  }

  function getInitialStringToEncode() {
    return new Promise(function (resolve, reject) {
      chrome.runtime.getBackgroundPage((backgroundPage) => {
        if (backgroundPage && backgroundPage.stringToEncode) {
          let url = backgroundPage.stringToEncode
          backgroundPage.stringToEncode = null
          resolve(url)
          return
        }

        browser.tabs.query({active: true, currentWindow: true})
          .then(function (tabs) {
            resolve(tabs[0].url)
          })
          .catch(function (e) {
            reject()
          })
      })
    })
  }

  function init() {
    domSource.addEventListener('keyup', function (e) {
      createQrCode()
    })

    domEcLevels.addEventListener('click', function (e) {
      switch (e.target.id) {
        case 'ecL':
          ecLevel = QRCode.CorrectLevel.L;
          break;
        case 'ecM':
          ecLevel = QRCode.CorrectLevel.M;
          break;
        case 'ecQ':
          ecLevel = QRCode.CorrectLevel.Q;
          break;
        case 'ecH':
          ecLevel = QRCode.CorrectLevel.H;
          break;
        default:
          return;
      }

      browser.storage.local.set({
        ecLevel: ecLevel
      })

      createQrCode()
    })

    browser.storage.local.get('ecLevel')
      .then(function (results) {
        console.log('got ecLevel from storage: ' + JSON.stringify(results))
        ecLevel = results.ecLevel || QRCode.CorrectLevel.M
        getInitialStringToEncode()
          .then(function (str) {
            createQrCode(str)
          })
          .catch(function () {

          })
      })
  }

  init()
})(browser, chrome);
