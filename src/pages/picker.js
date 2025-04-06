import { addClass, query as $, removeClass } from '../utils/dom'
import { apiNs } from '../utils/compat'
import { renderTemplate } from '../utils/i18n'
import { isUrl } from '../utils/misc'

class Picker {
  constructor () {
    this.resultContent = null
    this.winW = window.innerWidth
    this.winH = window.innerHeight
    this.x1 = this.x2 = this.winW / 2
    this.y1 = this.y2 = this.winH / 2
    this.mouseX = this.mouseY = null
    this.isScanning = false
    // scroll offset of the top frame
    this.scroll = { top: 0, left: 0 }

    // size of the scan region and related stuff
    this.minFactor = 0.2
    this.maxFactor = 10
    this.numLevel = 30
    // this.distance = Math.pow(this.maxFactor / this.minFactor, 1 / this.numLevel)
    this.distance = (this.maxFactor - this.minFactor) / this.numLevel
    this.baseScanSize = this.getBaseScanSize()
    this.setScaleLevel(10)
    this.defaultOptions = { openUrlMode: 'NO_OPEN' }
  }

  getBaseScanSize () {
    // Use outer size here because inner size may change during initialization
    return Math.min(window.outerWidth, window.outerHeight) / 10 * 1.1
  }

  setScaleLevel (value) {
    if (value < 0) {
      value = 0
    }
    if (value > this.numLevel) {
      value = this.numLevel
    }
    this.scaleLevel = value
    // const factor = this.minFactor * Math.pow(this.distance, this.scaleLevel)
    const factor = this.minFactor + (this.distance * this.scaleLevel)
    this.scanSize = this.baseScanSize * factor
  }

  handleKeyUp (event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      this.hide()
    }
  }

  handleWindowResize (event) {
    const winW = window.innerWidth
    const winH = window.innerHeight
    const ncX = ((this.x1 + this.x2) / 2) * winW / this.winW
    const ncY = ((this.y1 + this.y2) / 2) * winH / this.winH
    this.winW = winW
    this.winH = winH

    const oldBaseScanSize = this.baseScanSize
    this.baseScanSize = this.getBaseScanSize()

    const r = this.baseScanSize / oldBaseScanSize
    this.setScaleLevel(this.scaleLevel * r)
    const nhW = (this.x2 - this.x1) * r / 2
    const nhH = (this.y2 - this.y1) * r / 2
    this.x1 = ncX - nhW
    this.y1 = ncY - nhH
    this.x2 = ncX + nhW
    this.y2 = ncY + nhH
    this.updateSpotLight()
  }

  async initConnection () {
    [this.pickerLoaderPort, this.scroll] = await new Promise(resolve => {
      window.onmessage = (event) => {
        switch (event.data?.action) {
          case 'PICKER_SHOW':
            resolve([event.ports[0], event.data.scroll])
            break
        }
      }
    })

    if (!this.pickerLoaderPort) {
      console.error('picker frame received no port')
      return false
    }

    if (!await this.validateSecret()) {
      console.error('picker frame secret validation failed')
      return false
    }

    // update window size because the initial value we got in the constructor may be incorrect
    this.handleWindowResize()
    return true
  }

  async init () {
    // initialize connection to picker-loader.js when running in iframe
    if (window !== window.top && !await this.initConnection()) {
      return
    }

    const options = Object.assign(this.defaultOptions, await apiNs.runtime.sendMessage({ action: 'PICKER_GET_OPTIONS' }))

    renderTemplate($('#template'))

    this.domSelectUrlMode = $('#select-open-url-mode')
    this.domMask = $('#mask')
    this.domSpotlight = $('#spotlight')
    this.domTips = $('#tips')
    this.domX = $('#x-mark')
    this.domResult = $('#result')

    if (options.openUrlMode) {
      this.domSelectUrlMode.value = options.openUrlMode
    }

    this.updateSpotLight(this.winW / 2, this.winH / 2)

    // setting up event listeners...

    document.addEventListener('keyup', e => this.handleKeyUp(e))
    window.addEventListener('resize', e => this.handleWindowResize(e))

    this.domResult.addEventListener('mousedown', e => e.stopPropagation())
    this.domResult.addEventListener('click', (event) => {
      event.stopPropagation()
    })

    this.domX.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.hide()
    })
    this.domMask.addEventListener('click', event => {
      if (!this.isScanning) {
        this.isScanning = true
        this.scan()
      }
    })
    this.domMask.addEventListener('mouseenter', event => {
      if (!this.isScanning) {
        this.mouseX = event.clientX
        this.mouseY = event.clientY
        this.updateSpotLight(event.clientX, event.clientY)
      }
    })
    this.domMask.addEventListener('mousemove', event => {
      if (!this.isScanning) {
        this.mouseX = event.clientX
        this.mouseY = event.clientY
        this.updateSpotLight(event.clientX, event.clientY)
      }
    })
    this.domMask.addEventListener('mouseleave', event => {
      if (!this.isScanning) {
        this.mouseX = event.clientX
        this.mouseY = event.clientY
        this.updateSpotLight(0, 0, 0, 0)
      }
    })
    this.domMask.addEventListener('wheel', event => {
      event.preventDefault()
      event.stopPropagation()

      if (this.isScanning) {
        return
      }
      this.setScaleLevel(this.scaleLevel + (event.deltaY > 0 ? -1 : 1))
      this.updateSpotLight(event.clientX, event.clientY, undefined, undefined, '.1s')
    })
    this.domTips.addEventListener('click', e => {
      e.stopPropagation()
    })

    $('#copy-btn').addEventListener('click', () => this.copyResult())
    $('#rescan-btn').addEventListener('click', (ev) => this.newScan(ev))
    $('#open-link-btn').addEventListener('click', () => this.hide())
  }

  newScan (ev) {
    this.isScanning = false
    addClass('hidden', '#captured')
    addClass('hidden', this.domResult)
    removeClass('showing-result', this.domMask)
    if (ev) {
      this.updateSpotLight(ev.clientX, ev.clientY)
    }
  }

  updateSpotLight (x, y, w, h, td, tp, ttf) {
    this.nextSpotlightState = [x, y, w, h, td, tp, ttf]
    if (!this.renderSpotlightTimer) {
      this.renderSpotlightTimer = requestAnimationFrame(() => this.renderSpotlight())
    }
  }

  renderSpotlight () {
    if (!this.nextSpotlightState) {
      return
    }

    let [x, y, w, h, td, tp, ttf] = this.nextSpotlightState
    this.renderSpotlightTimer = this.nextSpotlightState = null

    if (typeof x !== 'undefined' && typeof y !== 'undefined') {
      if (typeof w === 'undefined' || typeof h === 'undefined') {
        w = h = this.scanSize
      }

      this.x1 = Math.floor(x - w / 2)
      this.y1 = Math.floor(y - h / 2)
      this.x2 = Math.floor(this.x1 + w)
      this.y2 = Math.floor(this.y1 + h)
    }

    let shouldHideSpotLight = this.hideOrShowUiElements()
    shouldHideSpotLight = shouldHideSpotLight || (this.x1 === this.x2 && this.y1 === this.y2)
    const rect = shouldHideSpotLight ? { x1: 0, y1: 0, x2: 0, y2: 0 } : { x1: this.x1, x2: this.x2, y1: this.y1, y2: this.y2 }

    if (shouldHideSpotLight) {
      addClass('off', this.domSpotlight)
    } else {
      removeClass('off', this.domSpotlight)
    }

    if (this.domMask) {
      if (td) {
        this.domMask.style.transitionDuration = td
        this.domMask.style.transitionProperty = tp || 'all'
        this.domMask.style.transitionTimingFunction = ttf || 'ease-out'
      } else {
        this.domMask.style.transitionProperty = ''
        this.domMask.style.transitionDuration = ''
        this.domMask.style.transitionTimingFunction = ''
      }
      this.domMask.style.backgroundColor = 'transparent'
      this.domMask.style.borderTopWidth = Math.max(0, rect.y1) + 'px'
      this.domMask.style.borderBottomWidth = Math.max(0, this.winH - rect.y2) + 'px'
      this.domMask.style.borderLeftWidth = Math.max(0, rect.x1) + 'px'
      this.domMask.style.borderRightWidth = Math.max(0, this.winW - rect.x2) + 'px'
    }
  }

  hideOrShowUiElements () {
    const mouseRect = { x: this.mouseX, y: this.mouseY, width: 0, height: 0 }
    const spotlightRect = { x: this.x1, y: this.y1, width: this.x2 - this.x1, height: this.y2 - this.y1 }

    let shouldHideSpotLight = false

    // elements to auto-hide when they overlap with the scan area
    const elements = [this.domTips, this.domX]

    for (const el of elements) {
      if (!el) { continue }
      const rect = el.getBoundingClientRect()
      const overlaps = this.collides(rect, spotlightRect)
      const mouseover = this.collides(rect, mouseRect)
      const shouldHide = overlaps && !mouseover
      el.style.opacity = shouldHide ? '0' : '1'

      shouldHideSpotLight = shouldHideSpotLight || mouseover
    }

    return shouldHideSpotLight
  }

  /**
   * collision detection
   * @param a {{x,y,width,height}}
   * @param b {{x,y,width,height}}
   * @return {boolean}
   */
  collides (a, b) {
    const ax1 = a.x
    const ay1 = a.y
    const ax2 = a.x + a.width
    const ay2 = a.y + a.height

    const bx1 = b.x
    const by1 = b.y
    const bx2 = b.x + b.width
    const by2 = b.y + b.height

    return !(ax2 < bx1 || bx2 < ax1 || ay2 < by1 || by2 < ay1)
  }

  hide () {
    if (this.pickerLoaderPort) {
      this.pickerLoaderPort.postMessage({ action: 'PICKER_CLOSE' })
    }
  }

  copyResult () {
    if (!this.resultContent) {
      return
    }

    let promise
    if (window === window.top) {
      promise = navigator.clipboard.writeText(this.resultContent)
    } else {
      // chrome doesn't allow copying text from iframe unless the 'clipboard-write' permission policy is set
      // we have to let the other side (picker-loader.js) do it for us
      promise = new Promise((resolve, reject) => {
        if (!this.pickerLoaderPort) {
          reject(new Error('Connection port is not set'))
        }

        const handleMessage = (message) => {
          const action = message.data?.action
          if (action === 'PICKER_COPY_TEXT_OK') {
            resolve()
          }
          if (action === 'PICKER_COPY_TEXT_ERROR' || action === 'PICKER_COPY_TEXT_OK') {
            if (this.pickerLoaderPort) {
              this.pickerLoaderPort.removeEventListener('message', handleMessage)
            }
            reject(new Error('Copy failed'))
          }
        }
        this.pickerLoaderPort.addEventListener('message', handleMessage)
        this.pickerLoaderPort.postMessage({
          action: 'PICKER_COPY_TEXT',
          text: this.resultContent
        })
        this.pickerLoaderPort.start()
      })
    }

    promise.then(() => {
      addClass('hidden', '#copy-btn')
      removeClass('hidden', '#copied-message')
      setTimeout(() => {
        addClass('hidden', '#copied-message')
        removeClass('hidden', '#copy-btn')
      }, 2000)
    })
  }

  async scan () {
    addClass('hidden', this.domResult)
    addClass('loading', this.domMask)
    this.resultContent = null

    let resImage
    let resText = ''
    let err = ''
    let successful = false
    const x = Math.max(this.x1, 0)
    const y = Math.max(this.y1, 0)
    const width = Math.min(this.x2, this.winW) - x
    const height = Math.min(this.y2, this.winH) - y

    const rect = { x, y, width, height }
    try {
      const res = await apiNs.runtime.sendMessage({
        action: 'BG_CAPTURE',
        rect,
        scroll: this.scroll,
        devicePixelRatio: window.devicePixelRatio
      })
      successful = !res.err
      resImage = res.image
      if (successful && res.result && res.result.length) {
        this.resultContent = resText = res.result[0].content
      } else {
        err = apiNs.i18n.getMessage('unable_to_decode_qr_code')
      }
    } catch (e) {
      console.error('picker frame error: ', e)
      err = e ? e.toString() : 'Unknown error'
    } finally {
      removeClass('loading', this.domMask)
    }
    this.showResult(err, resText, resImage, successful)
  }

  validateSecret () {
    const url = new URL(location.href)
    const secret = url.searchParams.get('secret')
    if (!secret) {
      return false
    }
    return apiNs.runtime.sendMessage({
      action: 'BG_VALIDATE_PICKER_SECRET',
      secret
    })
  }

  showResult (err, content, image, successful) {
    const isContentUrl = isUrl(content)

    let showResult = true
    if (isContentUrl) {
      showResult = false
      switch (this.domSelectUrlMode.value) {
        case 'OPEN':
          window.open(content, '_top')
          this.hide()
          break
        case 'OPEN_NEW_BG_TAB':
          apiNs.runtime.sendMessage({ action: 'BG_CREATE_TAB', active: false, url: content })
          break
        case 'OPEN_NEW_FG_TAB':
          apiNs.runtime.sendMessage({ action: 'BG_CREATE_TAB', active: true, url: content })
          break
        default:
          showResult = true
      }
    }
    if (!showResult) {
      this.newScan()
      return
    }

    addClass('showing-result', this.domMask)
    const textarea = $('#result-content')
    if (err) {
      textarea.innerText = ''
      textarea.placeholder = err
    } else {
      textarea.innerText = content
      textarea.placeholder = ''
    }

    const rr = $('#spotlight').getBoundingClientRect()
    const mr = this.domMask.getBoundingClientRect()

    // show captured image
    if (image) {
      const [aW, aH] = [rr.width, rr.height]
      const minW = mr.width * 0.5
      const maxW = mr.width * 0.8
      const minH = mr.height * 0.25
      const maxH = mr.height * 0.4

      const scaleX = aW < maxW ? (aW < minW ? minW / aW : 1) : maxW / aW
      const scaleY = aH < maxH ? (aH < minH ? minH / aH : 1) : maxH / aH
      const scale = Math.min(scaleX, scaleY)

      const [bW, bH] = [aW * scale, aH * scale]

      $('#captured').src = image
      removeClass('hidden', '#captured')
      this.updateSpotLight(mr.width / 2, (mr.height / 2) - (bH / 2) - (mr.height * 0.05), bW, bH, '.2s', 'all', 'ease-out')
    }

    // show or hide "Copy" button
    removeClass('hidden', this.domResult)
    const copyBtn = $('#copy-btn')
    if (content) {
      removeClass('hidden', copyBtn)
    } else {
      addClass('hidden', copyBtn)
    }

    // show or hide "Open Link" button
    const openLinkBtn = $('#open-link-btn')
    if (isContentUrl) {
      openLinkBtn.href = content
      removeClass('hidden', openLinkBtn)
    } else {
      addClass('hidden', openLinkBtn)
    }

    if (content) {
      textarea.select()
    } else {
      textarea.focus()
    }
  }
}

(new Picker()).init()
