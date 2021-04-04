import { QRCodeDecoderErrorCorrectionLevel as ECLevel } from '@zxing/library'
import { BrowserQRCodeReader, BrowserQRCodeSvgWriter } from '@zxing/browser'
import EncodeHintType from '@zxing/library/esm/core/EncodeHintType'
import ResultMetadataType from '@zxing/library/esm/core/ResultMetadataType'
import SanitizeFilename from 'sanitize-filename'
import manifest from '../manifest.json'

(function (browser, chrome) {
  let ecLevel = ECLevel.M
  let currentText = null
  let currentTitle = null

  const domSource = document.getElementById('sourceInput')
  const domCounter = document.getElementById('counter')
  const domResult = document.getElementById('result')
  const domEcLevels = document.getElementById('ecLevels')
  const domSave = document.getElementById('save')
  const domOpen = document.getElementById('open')

  function updateActiveEcLevel (activeEcLevel) {
    domEcLevels.querySelectorAll('.ec-level').forEach(function (el) {
      el.classList.remove('ec-level-active')
    })
    const id = 'ec' + activeEcLevel.toString()
    document.getElementById(id).classList.add('ec-level-active')
  }

  function createQrCode (text, activeEcLevel, title) {
    domSave.classList.add('hidden')
    domOpen.classList.add('hidden')

    domSource.value = text
    domCounter.innerText = '' + text.length
    updateActiveEcLevel(activeEcLevel)

    const writer = new BrowserQRCodeSvgWriter()
    const hints = new Map()
    hints.set(EncodeHintType.ERROR_CORRECTION, activeEcLevel)
    domResult.innerText = ''
    domResult.title = title || ''
    writer.writeToDom(domResult, text, 300, 300, hints)
    currentText = text

    domSave.classList.remove('hidden')
    currentTitle = title || ''
  }

  function getPopupOptions () {
    return new Promise(function (resolve, reject) {
      chrome.runtime.getBackgroundPage((backgroundPage) => {
        if (backgroundPage && backgroundPage.qrLitePopupOptions) {
          const options = backgroundPage.qrLitePopupOptions
          backgroundPage.qrLitePopupOptions = null
          resolve(options)
        } else {
          resolve(null)
        }
      })
    })
  }

  function getRelativePosition (rect1, rect2) {
    const relPos = {}

    relPos.top = rect1.top - rect2.top
    relPos.right = rect1.right - rect2.right
    relPos.bottom = rect1.bottom - rect2.bottom
    relPos.left = rect1.left - rect2.left

    return relPos
  }

  function createPointMarkerElement (point, containerEl, imgEl) {
    const containerRect = containerEl.getBoundingClientRect()
    const imgRect = imgEl.getBoundingClientRect()
    const markerEl = document.createElement('div')
    const relPos = getRelativePosition(imgRect, containerRect)
    const scaleRatioX = imgRect.width / imgEl.naturalWidth
    const scaleRatioY = imgRect.width / imgEl.naturalWidth
    const x = (point.getX() * scaleRatioX) + relPos.left
    const y = (point.getY() * scaleRatioY) + relPos.top
    const markerSize = 20
    const markerDotPortion = 0.6
    const markerBorderPortion = (1 - markerDotPortion)

    markerEl.innerText = ' '
    markerEl.style.position = 'absolute'
    markerEl.style.width = (markerSize * markerDotPortion) + 'px'
    markerEl.style.height = (markerSize * markerDotPortion) + 'px'
    markerEl.style.borderRadius = markerSize + 'px'
    markerEl.style.backgroundColor = 'white'
    markerEl.style.border = (markerSize * markerBorderPortion) + 'px solid lightgreen'
    markerEl.style.top = (y - (markerSize * 0.5)) + 'px'
    markerEl.style.left = (x - (markerSize * 0.5)) + 'px'

    containerEl.appendChild(markerEl)
  }

  function decodeImage (url) {
    domSave.classList.add('hidden')
    domOpen.classList.add('hidden')
    domResult.title = currentTitle = ''

    console.log('decoding image:', url)
    const codeReader = new BrowserQRCodeReader()

    domSource.value = ''
    domSource.placeholder = 'decoding...'

    return codeReader.decodeFromImageUrl(url).then(function (result) {
      const text = result.getText()
      const points = result.getResultPoints()

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

      for (let i = 0; i < points.length; i++) {
        createPointMarkerElement(points[i], domResult, img)
      }

      currentText = text

      if (/^https?:\/\//.test(text)) {
        domOpen.classList.remove('hidden')
      }
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

    domSave.addEventListener('click', function (e) {
      downloadImage()
    })

    domOpen.addEventListener('click', function (e) {
      browser.tabs.create({
        url: currentText,
        active: true
      })
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
                    resolve({ action: 'ACTION_ENCODE', text: tabs[0].url, title: tabs[0].title })
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
                return createQrCode(options.text, ecLevel, options.title)
              case 'ACTION_DECODE':
                return decodeImage(options.image)
            }
          })
          .catch(function (e) {
            console.log(e)
          })
      })

    document.getElementById('qrLiteVersion').innerText = 'v' + manifest.version
  }

  function getFilenameFromTitle (title) {
    return SanitizeFilename(title).substr(0, 100) + '.png'
  }

  function downloadImage () {
    const svg = document.querySelector('svg')
    const img = document.createElement('img')
    const canvas = document.createElement('canvas')
    const a = document.createElement('a')
    const xml = new XMLSerializer().serializeToString(svg)
    const svg64 = btoa(xml)

    canvas.width = svg.getBoundingClientRect().width
    canvas.height = svg.getBoundingClientRect().height
    img.src = 'data:image/svg+xml;base64,' + svg64
    img.onload = function () {
      const context = canvas.getContext('2d')
      context.fillStyle = '#FFFFFF'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(img, 0, 0)
      a.href = canvas.toDataURL('image/png')
      a.download = currentTitle ? getFilenameFromTitle(currentTitle) : 'qr-code.png'
      a.click()
    }
  }

  init()
})(window.browser, window.chrome)
