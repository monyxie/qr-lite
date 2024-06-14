import { QRCodeDecoderErrorCorrectionLevel as ECLevel } from '@zxing/library'
import { BrowserQRCodeSvgWriter } from '@zxing/browser'
import EncodeHintType from '@zxing/library/esm/core/EncodeHintType'
import SanitizeFilename from 'sanitize-filename'
import { apiNs, clipboard, storage } from '../utils/compat'
import { scan } from '../utils/qrcode'
import * as History from '../utils/history'
import { addClass, query as $, removeClass } from '../utils/dom'
import { renderTemplate } from '../utils/i18n'
import { isUrl, sleep } from '../utils/misc'

class Popup {
  constructor () {
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

  createRectMarker (vertices, containerEl, imgEl) {
    const $positionMarker = $('#positionMarker')
    const points = vertices.map(v => v.join(',')).join(' ')

    $positionMarker.innerHTML =
      `<svg
      class="qr-position-marker"
      aria-hidden="true"
      fill="lightgreen"
      viewBox="0 0 ${imgEl.width} ${imgEl.height}"
      xmlns="http://www.w3.org/2000/svg">
      <polygon fill="green" fill-opacity="0.3" stroke="#88FF00" stroke-width="1%" stroke-linejoin="round" stroke-opacity="0.9" points="${points.trim()}"></polygon>
   </svg>`
    removeClass('hidden', $positionMarker)
  }

  async decodeImage (url) {
    const that = this
    const $scanOutput = $('#scanOutput')
    const $scanInputImage = $('#scanInputImage')
    const $openLinkBtn = $('#openLinkBtn')

    this.showTab('scan')

    if (isUrl(url) && !await apiNs.permissions.contains({ origins: ['<all_urls>'] })) {
      removeClass('hidden', '#permissionInstructions')
      addClass('hidden', '#scanInstructions', '#scanInput')
      $('#grant-permissions-instructions').innerHTML = apiNs.i18n.getMessage(
        'grant_permissions_instructions_html',
        apiNs.i18n.getMessage('grant_all_urls_permission_name')
      )
      $('#grantPermissionsBtn').href = apiNs.runtime.getURL('/pages/grant.html?all-urls')
      return
    }

    addClass('hidden', '#scanInstructions', '#scanVideo', '#positionMarker', $openLinkBtn)
    removeClass('hidden', '#scanInput', $scanOutput, $scanInputImage)
    $scanOutput.value = ''
    $scanInputImage.src = url

    let error
    try {
      // wait for decode to complete before appending to dom and scanning
      await $scanInputImage.decode()

      const result = await scan($scanInputImage)
      if (result.length < 1) {
        $scanOutput.placeholder = apiNs.i18n.getMessage('unable_to_decode_qr_code')
      } else {
        const text = result[0].content
        const vertices = result[0].vertices

        $scanOutput.placeholder = ''
        $scanOutput.value = text
        $scanOutput.select()

        if (vertices) {
          that.createRectMarker(vertices, '#scanInput', $scanInputImage)
        }

        await that.addHistory('decode', text)

        if (isUrl(text)) {
          $openLinkBtn.classList.remove('hidden')
        }
      }
    } catch (e) {
      console.error(e)
      error = e.toString()
    }

    $scanOutput.placeholder = apiNs.i18n.getMessage('decoding_failed', error)
  }

  getFilenameFromTitle (title) {
    return SanitizeFilename(title).substr(0, 100) + '.png'
  }

  /**
   * @returns {Promise<HTMLCanvasElement>}
   */
  createCanvasForQrCode () {
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
        resolve(canvas)
      }
    })
  }

  downloadImage () {
    const that = this

    this.createCanvasForQrCode().then(canvas => {
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = that.currentTitle ? that.getFilenameFromTitle(that.currentTitle) : 'qr-code.png'
      a.click()
    })
  }

  copyImage () {
    this.createCanvasForQrCode()
      .then(canvas => clipboard.copyPng(canvas))
      .then(() => {
        addClass('hidden', $('#copy'))
        removeClass('hidden', $('#copied'))
        setTimeout(() => {
          removeClass('hidden', $('#copy'))
          addClass('hidden', $('#copied'))
        }, 2000)
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

  async startCameraScan () {
    const that = this
    const $scanOutput = $('#scanOutput')
    const $scanInputImage = $('#scanInputImage')
    const $cameraRescanBtn = $('#cameraRescanBtn')
    const $scanVideo = $('#scanVideo')
    const $scanInput = $('#scanInput')
    const $scanInstructions = $('#scanInstructions')
    const $scanningText = $('#scanningText')

    $cameraRescanBtn.onclick = () => this.startCameraScan()
    $scanVideo.onplay = () => removeClass('hidden', $scanningText)
    $scanVideo.onpause = () => addClass('hidden', $scanningText)

    this.showTab('scan')
    removeClass('hidden', '#scanInput')

    let stream
    try {
      stream = await navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
    } catch (e) {
      // getUserMedia() failed
      removeClass('hidden', '#permissionInstructions')
      $('#grant-permissions-instructions').innerHTML = apiNs.i18n.getMessage(
        'grant_permissions_instructions_html',
        apiNs.i18n.getMessage('grant_camera_permission_name')
      )
      $('#grantPermissionsBtn').href = apiNs.runtime.getURL('/pages/grant.html?camera')
      addClass('hidden', $scanInstructions)
      addClass('hidden', $scanInput)
      return
    }

    try {
      addClass('hidden', $scanInstructions, $scanInputImage, '#positionMarker', $cameraRescanBtn)
      removeClass('hidden', $scanOutput)
      $scanOutput.placeholder = ''
      $scanOutput.value = ''
      $scanVideo.classList.remove('hidden')
      $scanVideo.srcObject = stream
      $scanVideo.play()
      const canvas = document.createElement('canvas')

      let result
      while (true) {
        if (that.currentTab !== 'scan') {
          break
        }

        if (!$scanVideo.videoHeight || !$scanVideo.videoWidth || $scanVideo.paused) {
          await sleep(100)
          continue
        }

        canvas.width = 300
        canvas.height = $scanVideo.videoHeight / ($scanVideo.videoWidth / canvas.width)

        // Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true
        // This will affect all subsequent operations on the same canvas
        const context = canvas.getContext('2d', { willReadFrequently: true })
        context.drawImage($scanVideo, 0, 0, canvas.width, canvas.height)

        try {
          result = await scan(canvas)
        } catch (e) {
          console.error(e)
        }

        if (result && result.length > 0) {
          break
        }

        await sleep(100)
      }

      if (!result || !result.length) {
        return
      }

      const text = result[0].content
      const rect = result[0].vertices

      $scanOutput.placeholder = ''
      $scanOutput.value = text
      $scanOutput.select()

      $scanInputImage.classList.remove('hidden')
      $scanInputImage.src = canvas.toDataURL('image/png')

      $cameraRescanBtn.classList.remove('hidden')

      that.addHistory('decode', text)

      if (isUrl(text)) {
        $('#openLinkBtn').classList.remove('hidden')
      }

      $scanInputImage.decode().then(() => {
        if (rect) {
          that.createRectMarker(rect, $scanInput, $scanInputImage)
        }
      })
    } catch (err) {
      console.error(`An error occurred: ${err}`)
    } finally {
      if (stream) {
        stream.getTracks().forEach(function (track) {
          track.stop()
        })
      }
      $scanVideo.pause()
      $scanVideo.srcObject = undefined
      addClass('hidden', $scanningText)
      addClass('hidden', $scanVideo)
    }
  }

  /**
   * @param tab {string:'scan'|'generate'|'history'}
   */
  showTab (tab) {
    if (tab !== 'scan') {
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

  setZoom () {
    if (window.innerHeight < document.documentElement.scrollHeight) {
      document.documentElement.style.zoom = window.innerHeight / document.documentElement.scrollHeight
    }
  }

  async init () {
    $('#tab-history').addEventListener('click', () => {
      this.showTab('history')
    })
    $('#tab-generate').addEventListener('click', e => {
      this.showTab('generate')
    })
    $('#tab-scan').addEventListener('click', e => {
      this.showTab('scan')
    })

    $('#history').addEventListener('click', e => {
      if (e.target.tagName.toUpperCase() === 'LI') {
        this.createQrCode(e.target.title, this.ecLevel, undefined, 'now')
      }
    })
    $('#clear-history-btn').addEventListener('click', e => {
      this.clearHistory()
    })

    const $sourceInput = $('#sourceInput')
    const handleSourceInputChange = e => {
      if ($sourceInput.value !== this.currentText) {
        this.createQrCode($sourceInput.value, this.ecLevel, undefined, 'debounce')
      }
    }
    $sourceInput.addEventListener('keyup', handleSourceInputChange)
    $sourceInput.addEventListener('paste', handleSourceInputChange)
    $sourceInput.addEventListener('cut', handleSourceInputChange)

    $('#ecLevels').addEventListener('click', (e) => {
      switch (e.target.id) {
        case 'ecL':
        case 'ecM':
        case 'ecQ':
        case 'ecH':
          this.ecLevel = ECLevel.fromString(e.target.id.substr(2))
          break
        default:
          return
      }

      storage.set({
        ecLevel: this.ecLevel.toString()
      })

      this.createQrCode($sourceInput.value, this.ecLevel, undefined, 'none')
    })

    $('#save').addEventListener('click', (e) => {
      this.downloadImage()
    })

    $('#copy').addEventListener('click', (e) => {
      this.copyImage()
    })

    $('#scanRegion').addEventListener('click', (e) => {
      apiNs.runtime.sendMessage({
        action: 'BG_INJECT_PICKER_LOADER'
      })
      // close self (popup)
      window.close()
    })

    $('#cameraScan').addEventListener('click', (e) => {
      this.startCameraScan()
    })

    $('#openLinkBtn').addEventListener('click', (e) => {
      apiNs.tabs.create({
        url: $('#scanOutput').value,
        active: true
      })
    })

    $('#grantPermissionsBtn').addEventListener('click', (ev) => {
      ev.preventDefault()
      apiNs.tabs.create({
        url: ev.target.href
      })
      // close self (popup)
      window.close()
    })

    const results = await storage.get('ecLevel')
    if (results.ecLevel) {
      try {
        this.ecLevel = ECLevel.fromString(results.ecLevel)
      } catch (e) {
        console.error(e)
      }
    }

    apiNs.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'POPUP_DECODE':
          return this.decodeImage(request.image)
      }
    })

    await this.performInitialAction()
  }

  async performInitialAction () {
    let options = await apiNs.runtime.sendMessage({ action: 'POPUP_GET_OPTIONS' })

    if (!options) {
      const tabs = await apiNs.tabs.query({ active: true, currentWindow: true })
      if (tabs.length > 0) {
        options = { action: 'POPUP_ENCODE', text: tabs[0].url, title: tabs[0].title }
      }
    }

    if (!options) {
      options = { action: 'POPUP_ENCODE', text: '' }
    }

    switch (options.action) {
      case 'POPUP_ENCODE':
        this.createQrCode(options.text, this.ecLevel, options.title, 'now')
        break
      case 'POPUP_DECODE':
        this.decodeImage(options.image)
        break
      case 'POPUP_DECODE_CAMERA':
        this.startCameraScan()
        break
    }

    // needed in chrome to prevent the vertical scrollbar from showing up in the popup
    // when the default zoom level is set to a large value
    if (QRLITE_BROWSER === 'chrome') {
      this.setZoom()
    }
  }
}

window.__popup = new Popup()
window.__popup.init()
