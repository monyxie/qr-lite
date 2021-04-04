import { QRCodeDecoderErrorCorrectionLevel as ECLevel } from '@zxing/library'
import { BrowserQRCodeReader, BrowserQRCodeSvgWriter } from '@zxing/browser'
import EncodeHintType from '@zxing/library/esm/core/EncodeHintType'
import ResultMetadataType from '@zxing/library/esm/core/ResultMetadataType'
import SanitizeFilename from 'sanitize-filename'
import manifest from '../manifest.json'

class Popup {
  constructor (browser, chrome) {
    this.browser = browser
    this.chrome = chrome

    this.renderPage()

    this.ecLevel = ECLevel.M
    this.currentText = null
    this.currentTitle = null

    this.domSource = document.getElementById('sourceInput')
    this.domCounter = document.getElementById('counter')
    this.domResult = document.getElementById('result')
    this.domEcLevels = document.getElementById('ecLevels')
    this.domSave = document.getElementById('save')
    this.domOpen = document.getElementById('open')
  }

  updateActiveEcLevel (activeEcLevel) {
    this.domEcLevels.querySelectorAll('.ec-level').forEach(function (el) {
      el.classList.remove('ec-level-active')
    })
    const id = 'ec' + activeEcLevel.toString()
    document.getElementById(id).classList.add('ec-level-active')
  }

  createQrCode (text, activeEcLevel, title) {
    this.domSave.classList.add('hidden')
    this.domOpen.classList.add('hidden')

    this.domSource.value = text
    this.domCounter.innerText = '' + text.length
    this.updateActiveEcLevel(activeEcLevel)

    const writer = new BrowserQRCodeSvgWriter()
    const hints = new Map()
    hints.set(EncodeHintType.ERROR_CORRECTION, activeEcLevel)
    this.domResult.innerText = ''
    this.domResult.title = title || ''
    writer.writeToDom(this.domResult, text, 300, 300, hints)
    this.currentText = text

    this.domSave.classList.remove('hidden')
    this.currentTitle = title || ''
  }

  getPopupOptions () {
    const that = this
    return new Promise(function (resolve, reject) {
      that.chrome.runtime.getBackgroundPage((backgroundPage) => {
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

  getRelativePosition (rect1, rect2) {
    const relPos = {}

    relPos.top = rect1.top - rect2.top
    relPos.right = rect1.right - rect2.right
    relPos.bottom = rect1.bottom - rect2.bottom
    relPos.left = rect1.left - rect2.left

    return relPos
  }

  createPointMarkerElement (point, containerEl, imgEl) {
    const containerRect = containerEl.getBoundingClientRect()
    const imgRect = imgEl.getBoundingClientRect()
    const markerEl = document.createElement('div')
    const relPos = this.getRelativePosition(imgRect, containerRect)
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

  decodeImage (url) {
    this.domSave.classList.add('hidden')
    this.domOpen.classList.add('hidden')
    this.domResult.title = this.currentTitle = ''

    // console.log('decoding image:', url)
    const codeReader = new BrowserQRCodeReader()

    this.domSource.value = ''
    this.domSource.placeholder = this.browser.i18n.getMessage('decoding')

    const that = this
    return codeReader.decodeFromImageUrl(url).then(function (result) {
      const text = result.getText()
      const points = result.getResultPoints()

      that.domSource.placeholder = ''
      that.domSource.value = text
      that.domSource.select()
      that.domCounter.innerText = '' + text.length

      const metaEcLevel = result.getResultMetadata().get(ResultMetadataType.ERROR_CORRECTION_LEVEL)
      if (typeof metaEcLevel !== 'undefined') {
        try {
          const activeEcLevel = ECLevel.fromString(metaEcLevel)
          that.updateActiveEcLevel(activeEcLevel)
        } catch (e) {
        }
      }

      that.domResult.innerText = ''
      const img = document.createElement('img')
      img.classList.add('decoded-image')
      img.src = url
      that.domResult.appendChild(img)

      for (let i = 0; i < points.length; i++) {
        that.createPointMarkerElement(points[i], that.domResult, img)
      }

      that.currentText = text

      if (/^https?:\/\//.test(text)) {
        that.domOpen.classList.remove('hidden')
      }
    })
      .catch(function (e) {
        that.domSource.placeholder = that.browser.i18n.getMessage('decoding_failed', e.toString())
      })
  }

  getFilenameFromTitle (title) {
    return SanitizeFilename(title).substr(0, 100) + '.png'
  }

  downloadImage () {
    const svg = document.querySelector('svg')
    const img = document.createElement('img')
    const canvas = document.createElement('canvas')
    const a = document.createElement('a')
    const xml = new XMLSerializer().serializeToString(svg)
    const svg64 = btoa(xml)
    const that = this

    canvas.width = svg.getBoundingClientRect().width
    canvas.height = svg.getBoundingClientRect().height
    img.src = 'data:image/svg+xml;base64,' + svg64
    img.onload = function () {
      const context = canvas.getContext('2d')
      context.fillStyle = '#FFFFFF'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(img, 0, 0)
      a.href = canvas.toDataURL('image/png')
      a.download = that.currentTitle ? that.getFilenameFromTitle(that.currentTitle) : 'qr-code.png'
      a.click()
    }
  }

  renderPage () {
    const that = this
    // console.log('rendering template, language code: ' + this.browser.i18n.languageCode)

    // this.browser.i18n.getAcceptLanguages().then(a => console.log('accept language: ' + a))
    const domTemplate = document.getElementById('template')
    const template = domTemplate.innerHTML
    domTemplate.parentElement.innerHTML = template.replace(/{{__MSG_(\w+)__}}/g, function (match, contents, offset) {
      const message = that.browser.i18n.getMessage(contents)
      // console.log('replace:', contents, message)
      return message
    })
  }

  init () {
    const that = this

    this.domSource.addEventListener('keyup', function (e) {
      if (this.domSource.value !== that.currentText) {
        that.createQrCode(this.domSource.value, that.ecLevel)
      }
    })

    this.domEcLevels.addEventListener('click', function (e) {
      switch (e.target.id) {
        case 'ecL':
        case 'ecM':
        case 'ecQ':
        case 'ecH':
          that.ecLevel = ECLevel.fromString(e.target.id.substr(2))
          break
        default:
          return
      }

      that.browser.storage.local.set({
        ecLevel: that.ecLevel.toString()
      })

      that.createQrCode(that.domSource.value, that.ecLevel)
    })

    this.domSave.addEventListener('click', function (e) {
      that.downloadImage()
    })

    this.domOpen.addEventListener('click', function (e) {
      that.browser.tabs.create({
        url: that.currentText,
        active: true
      })
    })

    that.browser.storage.local.get('ecLevel')
      .then(function (results) {
        // console.log('got ecLevel from storage: ' + JSON.stringify(results))
        if (results.ecLevel) {
          try {
            that.ecLevel = ECLevel.fromString(results.ecLevel)
          } catch (e) {
            console.error(e)
          }
        }

        that.getPopupOptions()
          .then(function (options) {
            if (options === null) {
              return new Promise(function (resolve, reject) {
                that.browser.tabs.query({ active: true, currentWindow: true })
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
                return that.createQrCode(options.text, that.ecLevel, options.title)
              case 'ACTION_DECODE':
                return that.decodeImage(options.image)
            }
          })
          .catch(function (e) {
            console.error(e)
          })
      })

    document.getElementById('qrLiteVersion').innerText = 'v' + manifest.version
  }
}

(new Popup(window.browser, window.chrome)).init()
