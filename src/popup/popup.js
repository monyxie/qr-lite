import { QRCodeDecoderErrorCorrectionLevel as ECLevel } from '@zxing/library'
import { BrowserQRCodeSvgWriter } from '@zxing/browser'
import EncodeHintType from '@zxing/library/esm/core/EncodeHintType'
import SanitizeFilename from 'sanitize-filename'
import Storage from '../utils/storage'
import Tabs from '../utils/tabs'
import { scan } from '../qr-scanner-wechat/index.mjs'
import * as History from '../utils/history'
import { addClass, query as $, removeClass } from '../utils/dom'
import { renderTemplate } from '../utils/i18n'
import { isUrl } from '../utils/str'

class Popup {
  constructor (browser, chrome) {
    this.browser = browser
    this.chrome = chrome

    this.renderPage()

    this.ecLevel = ECLevel.M
    this.currentText = null
    this.currentTitle = null
    this.historyTimer = null
    this.currentTab = null
  }

  updateActiveEcLevel (activeEcLevel) {
    $('#ecLevels').querySelectorAll('.ec-level').forEach(function (el) {
      el.classList.remove('ec-level-active')
    })
    $('#ec' + activeEcLevel.toString()).classList.add('ec-level-active')
  }

  getHistory () {
    return History.getHistory()
  }

  clearHistory () {
    return History.clearHistory().then(() => this.renderHistory())
  }

  addHistory (type, text) {
    return History.addHistory(type, text)
  }

  createQrCode (text, activeEcLevel, title, historyMode) {
    const that = this
    const $save = $('#save')
    const $copy = $('#copy')
    const $copied = $('#copied')
    const $result = $('#result')
    this.showTab('generate')
    addClass('hidden', $save, $copy, $copied, $('#openLinkBtn'))

    $('#sourceInput').value = text
    $('#counter').innerText = '' + text.length
    this.updateActiveEcLevel(activeEcLevel)

    this.currentText = text
    $result.innerText = ''
    if (!text) {
      return
    }

    if (historyMode === 'now') {
      that.addHistory('encode', text)
    } else if (historyMode === 'debounce') {
      clearTimeout(this.historyTimer)
      this.historyTimer = setTimeout(() => {
        that.addHistory('encode', text)
      }, 1000)
    }

    const writer = new BrowserQRCodeSvgWriter()
    const hints = new Map()
    hints.set(EncodeHintType.ERROR_CORRECTION, activeEcLevel)
    $result.innerText = ''
    writer.writeToDom($result, text, 300, 300, hints)

    $save.classList.remove('hidden')
    $copy.classList.remove('hidden')
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

  createRectMarker (rect, containerEl, imgEl) {
    const containerRect = containerEl.getBoundingClientRect()
    const imgRect = imgEl.getBoundingClientRect()
    const relPos = this.getRelativePosition(imgRect, containerRect)
    const scaleRatioX = imgRect.width / imgEl.naturalWidth
    const scaleRatioY = imgRect.width / imgEl.naturalWidth
    const $positionMarker = $('#positionMarker')

    $positionMarker.style.top = ((rect.y * scaleRatioY) + relPos.top) + 'px'
    $positionMarker.style.left = ((rect.x * scaleRatioX) + relPos.left) + 'px'
    $positionMarker.style.width = (rect.width * scaleRatioX) + 'px'
    $positionMarker.style.height = (rect.height * scaleRatioY) + 'px'
    $positionMarker.classList.remove('hidden')
  }

  async decodeImage (url) {
    const that = this
    const $scanOutput = $('#scanOutput')
    const $scanInput = $('#scanInput')
    const $scanInputImage = $('#scanInputImage')
    const $openLinkBtn = $('#openLinkBtn')
    const $scanInstructions = $('#scanInstructions')
    const $scanVideo = $('#scanVideo')
    const $positionMarker = $('#positionMarker')

    this.showTab('scan')
    removeClass('hidden', '#scanInput')

    $openLinkBtn.classList.add('hidden')
    $scanOutput.value = ''
    $scanOutput.classList.remove('hidden')
    $scanOutput.placeholder = this.browser.i18n.getMessage('decoding')

    $scanInputImage.src = url
    $scanInputImage.classList.remove('hidden')
    $scanInstructions.classList.add('hidden')
    $scanVideo.classList.add('hidden')
    $positionMarker.classList.add('hidden')

    // wait for decode to complete before appending to dom and scanning
    await $scanInputImage.decode()

    // we pass a cloned img node because the original img node is still being appended to the dom
    // causing qr-code-wechat to get img.width/img.height values of zero
    try {
      const result = await scan($scanInputImage.cloneNode())
      const text = result.text
      const rect = result.rect // only with qr-scanner-wechat

      if (typeof text === 'undefined') {
        $scanOutput.placeholder = that.browser.i18n.getMessage('unable_to_decode_qr_code')
      } else {
        $scanOutput.placeholder = ''
        $scanOutput.value = text
        $scanOutput.select()

        if (rect) {
          that.createRectMarker(rect, $scanInput, $scanInputImage)
        }

        await that.addHistory('decode', text)

        if (isUrl(text)) {
          $openLinkBtn.classList.remove('hidden')
        }
      }
    } catch (e) {
      console.error(e)
      $scanOutput.placeholder = that.browser.i18n.getMessage('decoding_failed', e.toString())
    }
  }

  getFilenameFromTitle (title) {
    return SanitizeFilename(title).substr(0, 100) + '.png'
  }

  /**
   * @returns {Promise<string|ImageData>}
   */
  getPngData () {
    return new Promise((resolve, reject) => {
      const svg = document.querySelector('svg')
      const img = document.createElement('img')
      const canvas = document.createElement('canvas')
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
        resolve(canvas.toDataURL('image/png'))
      }
    })
  }

  downloadImage () {
    const that = this

    this.getPngData().then(url => {
      const a = document.createElement('a')
      a.href = url
      a.download = that.currentTitle ? that.getFilenameFromTitle(that.currentTitle) : 'qr-code.png'
      a.click()
    })
  }

  copyImage () {
    const that = this

    this.getPngData().then(url => {
      const arr = Uint8Array.from(atob(url.split(',')[1]), (m) => m.codePointAt(0))
      that.browser.clipboard.setImageData(arr.buffer, 'png').then(() => {
        addClass('hidden', $('#copy'))
        removeClass('hidden', $('#copied'))
        setTimeout(() => {
          removeClass('hidden', $('#copy'))
          addClass('hidden', $('#copied'))
        }, 2000)
      })
    })
  }

  renderPage () {
    renderTemplate($('#template'))
  }

  renderHistory () {
    this.getHistory()
      .then(function (history) {
        const ul = $('#history-items')
        ul.innerHTML = ''
        history.reverse()
        for (let i = 0; i < history.length; i++) {
          const li = document.createElement('li')
          li.title = history[i].text || ''

          const img = document.createElement('img')
          if (history[i].type === 'decode') {
            img.src = '../icons/scan.svg'
          } else {
            img.src = '../icons/generate.svg'
          }
          li.appendChild(img)
          li.appendChild(document.createTextNode(' ' + (history[i].text || '')))
          ul.appendChild(li)
        }
      })
  }

  startCameraScan () {
    const that = this
    const $scanOutput = $('#scanOutput')
    const $scanInputImage = $('#scanInputImage')
    const $cameraRescanBtn = $('#cameraRescanBtn')
    const $openLinkBtn = $('#openLinkBtn')
    const $scanVideo = $('#scanVideo')
    const $scanInput = $('#scanInput')
    const $scanInstructions = $('#scanInstructions')
    const $positionMarker = $('#positionMarker')
    const $permissionInstructions = $('#permissionInstructions')
    const $scanningText = $('#scanningText')

    $cameraRescanBtn.onclick = () => this.startCameraScan()
    $scanVideo.onplay = () => removeClass('hidden', $scanningText)
    $scanVideo.onpause = () => addClass('hidden', $scanningText)

    this.showTab('scan')
    removeClass('hidden', '#scanInput')

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        addClass('hidden', $scanInstructions, $scanInputImage, $positionMarker, $cameraRescanBtn)
        removeClass('hidden', $scanOutput)
        $scanOutput.placeholder = ''
        $scanOutput.value = ''
        $scanVideo.classList.remove('hidden')
        $scanVideo.srcObject = stream
        $scanVideo.play()
        const canvas = document.createElement('canvas')

        const stop = () => {
          $scanVideo.pause()
          addClass('hidden', $scanningText)
          addClass('hidden', $scanVideo)
          $scanVideo.srcObject = undefined
          stream.getTracks().forEach(function (track) {
            track.stop()
          })
        }

        const scanVideo = function () {
          if (that.currentTab !== 'scan') {
            stop()
            return
          }

          if (!$scanVideo.videoHeight || !$scanVideo.videoWidth || $scanVideo.paused) {
            setTimeout(scanVideo, 100)
            return
          }

          canvas.width = 300
          canvas.height = $scanVideo.videoHeight / ($scanVideo.videoWidth / canvas.width)

          const context = canvas.getContext('2d')
          context.drawImage($scanVideo, 0, 0, canvas.width, canvas.height)

          scan(canvas).then(function (result) {
            const text = result.text
            const rect = result.rect

            if (typeof text === 'undefined' || text === '') {
              setTimeout(scanVideo, 100)
              return
            }

            stop()

            $scanOutput.placeholder = ''
            $scanOutput.value = text
            $scanOutput.select()

            $scanInputImage.classList.remove('hidden')
            $scanInputImage.src = canvas.toDataURL('image/png')

            $cameraRescanBtn.classList.remove('hidden')

            that.addHistory('decode', text)

            if (isUrl(text)) {
              $openLinkBtn.classList.remove('hidden')
            }

            $scanInputImage.decode().then(() => {
              if (rect) {
                that.createRectMarker(rect, $scanInput, $scanInputImage)
              }
            })
          })
            .catch(function (e) {
              console.error(e)
              setTimeout(scanVideo, 100)
            })
        }

        scanVideo()
      }, () => {
        // getUserMedia() failed
        removeClass('hidden', $permissionInstructions)
        addClass('hidden', $scanInstructions)
        addClass('hidden', $scanInput)
      })
      .catch((err) => {
        console.error(`An error occurred: ${err}`)
      })
  }

  showTab (tab) {
    if (tab !== scan) {
      addClass('hidden', '#scanOutput', '#scanInputImage', '#cameraRescanBtn', '#openLinkBtn', '#scanVideo', '#positionMarker', '#permissionInstructions')
      removeClass('hidden', '#scanInput', '#scanInstructions')
    }

    if (tab === 'history') {
      $('#tab-generate').classList.remove('active')
      $('#tab-scan').classList.remove('active')
      $('#tab-history').classList.add('active')
      $('#main').classList.add('hidden')
      $('#scan').classList.add('hidden')
      $('#history').classList.remove('hidden')

      this.renderHistory()
    } else if (tab === 'scan') {
      $('#tab-generate').classList.remove('active')
      $('#tab-scan').classList.add('active')
      $('#tab-history').classList.remove('active')
      $('#main').classList.add('hidden')
      $('#scanInput').classList.add('hidden')
      $('#scan').classList.remove('hidden')
      $('#history').classList.add('hidden')
    } else if (tab === 'generate') {
      $('#tab-generate').classList.add('active')
      $('#tab-scan').classList.remove('active')
      $('#tab-history').classList.remove('active')
      $('#main').classList.remove('hidden')
      $('#scan').classList.add('hidden')
      $('#history').classList.add('hidden')
    }

    this.currentTab = tab
  }

  init () {
    const that = this
    that.showTab('generate')

    $('#tab-history').addEventListener('click', function () {
      that.showTab('history')
    })
    $('#tab-generate').addEventListener('click', function (e) {
      that.showTab('generate')
    })
    $('#tab-scan').addEventListener('click', function (e) {
      that.showTab('scan')
    })

    $('#history').addEventListener('click', function (e) {
      if (e.target.tagName.toUpperCase() === 'LI') {
        that.createQrCode(e.target.innerText, that.ecLevel, undefined, 'now')
      }
    })
    $('#clear-history-btn').addEventListener('click', function (e) {
      that.clearHistory()
    })

    const $sourceInput = $('#sourceInput')
    const handleSourceInputChange = function (e) {
      if ($sourceInput.value !== that.currentText) {
        that.createQrCode($sourceInput.value, that.ecLevel, undefined, 'debounce')
      }
    }
    $sourceInput.addEventListener('keyup', handleSourceInputChange)
    $sourceInput.addEventListener('paste', handleSourceInputChange)
    $sourceInput.addEventListener('cut', handleSourceInputChange)

    $('#ecLevels').addEventListener('click', function (e) {
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

      Storage.set({
        ecLevel: that.ecLevel.toString()
      })

      that.createQrCode($sourceInput.value, that.ecLevel, undefined, 'none')
    })

    $('#save').addEventListener('click', function (e) {
      that.downloadImage()
    })

    $('#copy').addEventListener('click', function (e) {
      that.copyImage()
    })

    $('#scanRegion').addEventListener('click', function (e) {
      that.browser.tabs.executeScript({
        file: '../content_scripts/scan_region_picker.js'
      })

      // close self (popup)
      window.close()
    })

    $('#cameraScan').addEventListener('click', function (e) {
      that.startCameraScan()
    })

    $('#openLinkBtn').addEventListener('click', function (e) {
      Tabs.create({
        url: $('#scanOutput').value,
        active: true
      })
    })

    $('#grantPermissionsBtn').addEventListener('click', () => {
      // close self (popup)
      that.browser.tabs.create({
        url: '../pages/grant.html'
      })
      window.close()
    })

    Storage.get('ecLevel')
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
            // console.log('options', options)
            if (options === null) {
              return new Promise(function (resolve, reject) {
                Tabs.query({ active: true, currentWindow: true })
                  .then(function (tabs) {
                    // console.log('tabs', tabs)
                    resolve({ action: 'ACTION_ENCODE', text: tabs[0].url, title: tabs[0].title })
                  })
                  .catch(function (e) {
                    console.error('tabs failed', e)
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
                return that.createQrCode(options.text, that.ecLevel, options.title, 'now')
              case 'ACTION_DECODE':
                return that.decodeImage(options.image)
              case 'ACTION_DECODE_CAMERA':
                return that.startCameraScan()
            }
          })
          .catch(function (e) {
            console.error(e)
          })
      })
  }
}

window.__popup = (new Popup(window.browser || window.chrome, window.chrome))
window.__popup.init()
