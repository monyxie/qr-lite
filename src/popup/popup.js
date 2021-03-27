import { QRCodeDecoderErrorCorrectionLevel as ECLevel } from '@zxing/library'
import { BrowserQRCodeSvgWriter, BrowserQRCodeReader } from '@zxing/browser'
import EncodeHintType from '@zxing/library/esm/core/EncodeHintType'
import ResultMetadataType from '@zxing/library/esm/core/ResultMetadataType';

(function (browser, chrome) {
  let ecLevel = ECLevel.M
  let currentText = null

  const domSource = document.getElementById('sourceInput')
  const domCounter = document.getElementById('counter')
  const domResult = document.getElementById('result')
  const domEcLevels = document.getElementById('ecLevels')

  function updateActiveEcLevel (activeEcLevel) {
    domEcLevels.querySelectorAll('.ec-level').forEach(function (el) {
      el.classList.remove('ec-level-active')
    })
    const id = 'ec' + activeEcLevel.toString()
    document.getElementById(id).classList.add('ec-level-active')
  }

  function createQrCode (text, activeEcLevel) {
    domSource.value = text
    domCounter.innerText = '' + text.length
    updateActiveEcLevel(activeEcLevel)

    const writer = new BrowserQRCodeSvgWriter()
    const hints = new Map()
    hints.set(EncodeHintType.ERROR_CORRECTION, activeEcLevel)
    domResult.innerText = ''
    writer.writeToDom(domResult, text, 300, 300, hints)
    currentText = text
  }

  function getPopupOptions () {
    return new Promise(function (resolve, reject) {
      chrome.runtime.getBackgroundPage((backgroundPage) => {
        if (backgroundPage && backgroundPage.qrLitePopupOptions) {
          const url = backgroundPage.qrLitePopupOptions
          backgroundPage.qrLitePopupOptions = null
          resolve(url)
        } else {
          resolve(null)
        }
      })
    })
  }

  function decodeImage (url) {
    console.log('decoding image:', url)
    const codeReader = new BrowserQRCodeReader()

    domSource.value = ''
    domSource.placeholder = 'decoding...'

    return codeReader.decodeFromImageUrl(url).then(function (result) {
      const text = result.getText()
      domSource.placeholder = ''
      domSource.value = text
      domSource.select()
      domCounter.innerText = '' + text.length

      const metaEcLevel = result.getResultMetadata().get(ResultMetadataType.ERROR_CORRECTION_LEVEL)
      if (typeof metaEcLevel !== 'undefined') {
        try {
          const activeEcLevel = ECLevel.fromString(metaEcLevel)
          updateActiveEcLevel(activeEcLevel)
        } catch (e) {
        }
      }

      domResult.innerText = ''
      const img = document.createElement('img')
      img.classList.add('decoded-image')
      img.src = url
      domResult.appendChild(img)

      currentText = text
    })
      .catch(function (e) {
        domSource.placeholder = 'decode failed: ' + e
      })
  }

  function init () {
    domSource.addEventListener('keyup', function (e) {
      if (domSource.value !== currentText) {
        createQrCode(domSource.value, ecLevel)
      }
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

      createQrCode(domSource.value, ecLevel)
    })

    browser.storage.local.get('ecLevel')
      .then(function (results) {
        console.log('got ecLevel from storage: ' + JSON.stringify(results))
        try {
          ecLevel = ECLevel.fromString(results.ecLevel)
        } catch (e) {
          console.log(e)
        }

        getPopupOptions()
          .then(function (options) {
            if (options === null) {
              return new Promise(function (resolve, reject) {
                browser.tabs.query({ active: true, currentWindow: true })
                  .then(function (tabs) {
                    resolve({ action: 'ACTION_ENCODE', text: tabs[0].url })
                  })
                  .catch(function (e) {
                    resolve({ action: 'ACTION_ENCODE', text: '' })
                  })
              })
            } else {
              return options
            }
          })
          .then(function (options) {
            switch (options.action) {
              case 'ACTION_ENCODE':
                return createQrCode(options.text, ecLevel)
              case 'ACTION_DECODE':
                return decodeImage(options.image)
            }
          })
          .catch(function (e) {
            console.log(e)
          })
      })
  }

  init()
})(window.browser, window.chrome)