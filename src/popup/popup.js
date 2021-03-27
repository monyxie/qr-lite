import { QRCodeDecoderErrorCorrectionLevel as ECLevel } from '@zxing/library'
import { BrowserQRCodeSvgWriter } from '@zxing/browser'
import EncodeHintType from '@zxing/library/esm/core/EncodeHintType'

(function (browser, chrome) {
  let ecLevel = ECLevel.M

  const domSource = document.getElementById('sourceInput')
  const domCounter = document.getElementById('counter')
  const domResult = document.getElementById('result')
  const domEcLevels = document.getElementById('ecLevels')

  function updateActiveEcLevel () {
    domEcLevels.querySelectorAll('.ec-level').forEach(function (el) {
      el.classList.remove('ec-level-active')
    })
    const id = 'ec' + ecLevel.toString()
    document.getElementById(id).classList.add('ec-level-active')
  }

  function createQrCode (str) {
    if (typeof str === 'undefined') {
      str = domSource.value
    } else {
      domSource.value = str
    }

    domCounter.innerText = '' + str.length
    updateActiveEcLevel()

    console.log('create QR code for: ' + str)
    console.log('correction Level: ' + ecLevel)

    const writer = new BrowserQRCodeSvgWriter()
    const hints = new Map()
    hints.set(EncodeHintType.ERROR_CORRECTION, ecLevel)
    domResult.innerText = ''
    writer.writeToDom(domResult, str, 300, 300, hints)
  }

  function getInitialStringToEncode () {
    return new Promise(function (resolve, reject) {
      chrome.runtime.getBackgroundPage((backgroundPage) => {
        if (backgroundPage && backgroundPage.stringToEncode) {
          const url = backgroundPage.stringToEncode
          backgroundPage.stringToEncode = null
          resolve(url)
          return
        }

        browser.tabs.query({ active: true, currentWindow: true })
          .then(function (tabs) {
            resolve(tabs[0].url)
          })
          .catch(function (e) {
            reject(e)
          })
      })
    })
  }

  function init () {
    domSource.addEventListener('keyup', function (e) {
      createQrCode()
    })

    domEcLevels.addEventListener('click', function (e) {
      switch (e.target.id) {
        case 'ecL':
        case 'ecM':
        case 'ecQ':
        case 'ecH':
          ecLevel = ECLevel.fromString(e.target.id.substr(2))
          break
        default:
          return
      }

      browser.storage.local.set({
        ecLevel: ecLevel.toString()
      })

      createQrCode()
    })

    browser.storage.local.get('ecLevel')
      .then(function (results) {
        console.log('got ecLevel from storage: ' + JSON.stringify(results))
        try {
          ecLevel = ECLevel.fromString(results.ecLevel)
        } catch (e) {
          console.log(e)
        }

        getInitialStringToEncode()
          .then(function (str) {
            createQrCode(str)
          })
          .catch(function (e) {
            console.log(e)
          })
      })
  }

  init()
})(window.browser, window.chrome)
