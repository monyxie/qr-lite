import { createElement } from '../utils/dom'
import copyIcon from '../icons/copy.svg'
import openUrlIcon from '../icons/open-url.svg'
import refreshIcon from '../icons/refresh.svg'
import { isUrl } from '../utils/misc'
import { apiNs } from '../utils/compat'

class Picker {
  constructor () {
    this.x1 = this.x2 = this.y1 = this.y2 = null
    this.mouseX = this.mouseY = null
    this.isScanning = false
    this.maskColor = 'rgba(0,0,0,0.5)'

    // size of the scan region and related stuff
    this.winW = window.innerWidth
    this.winH = window.innerHeight
    this.minFactor = 0.2
    this.maxFactor = 10
    this.numLevel = 30
    // this.distance = Math.pow(this.maxFactor / this.minFactor, 1 / this.numLevel)
    this.distance = (this.maxFactor - this.minFactor) / this.numLevel
    this.baseScanSize = this.getBaseScanSize()
    this.setScaleLevel(10)
  }

  getBaseScanSize () {
    return Math.min(this.winW, this.winH) / 10 * 1.1
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

  init () {
    this.keyupHandler = (event) => {
      if (event.key === 'Escape' && this.isShown) {
        event.preventDefault()
        event.stopPropagation()
        this.hide()
      }
    }
    this.resizeHandler = (event) => {
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
      this.updateSpotLight(true)
    }

    this.domMask = createElement(`
    <div style="position: fixed; top: 0; left: 0; z-index: 2147483647; width: 100%; height: 100%;
    box-sizing: border-box; background-color: ${this.maskColor}; border-color: ${this.maskColor}; border-style: solid; border-width: 0; cursor: crosshair">
    </div>`)

    this.domTips = createElement(`
    <div style="padding: 4px; position: fixed; left: 0; top: 0; color: white; text-shadow: #000 0 1px 10px, #000 0 1px 10px, #000 0 1px 10px;
    user-select: none; font-size: 14px; font-family: sans-serif; min-width: 100px; transition: opacity linear 0.1s">
    ${apiNs.i18n.getMessage('scan_region_picker_tips_html')}</div>`)

    this.domRect = createElement('<div style="background-color: transparent; width: 100%; height: 100%; outline: white solid 2px; border-radius: 4px; box-shadow: black 0 0 10px;"></div>')
    this.domX = createElement(`<div style="position: fixed; width: 36px; height: 36px; text-align: center;
    line-height: 36px; right: 0; top: 0;margin: 4px; color: white;  text-shadow: #000 0 0 10px, #000 0 0 10px, #000 0 0 10px;
    font-family: sans-serif; font-size: 36px; cursor: pointer; transition: opacity linear 0.1s">&times;</div>`)

    this.domMask.appendChild(this.domRect)
    this.domMask.appendChild(this.domTips)
    this.domMask.appendChild(this.domX)

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
        this.updateSpotLight(true, event.clientX, event.clientY)
      }
    })
    this.domMask.addEventListener('mousemove', event => {
      if (!this.isScanning) {
        this.mouseX = event.clientX
        this.mouseY = event.clientY
        this.updateSpotLight(true, event.clientX, event.clientY)
      }
    })
    this.domMask.addEventListener('wheel', event => {
      event.preventDefault()
      event.stopPropagation()

      if (this.isScanning) {
        return
      }
      this.setScaleLevel(this.scaleLevel + (event.deltaY > 0 ? -1 : 1))
      this.updateSpotLight(true, event.clientX, event.clientY, undefined, undefined, '.1s')
    })
  }

  updateSpotLight (show, x, y, w, h, animate) {
    if (show) {
      if (typeof x !== 'undefined' && typeof y !== 'undefined') {
        if (typeof w === 'undefined' || typeof h === 'undefined') {
          w = h = this.scanSize
        }

        this.x1 = Math.floor(x - w / 2)
        this.y1 = Math.floor(y - h / 2)
        this.x2 = Math.floor(this.x1 + w)
        this.y2 = Math.floor(this.y1 + h)
      }

      if (animate) {
        // this.domMask.style.transitionProperty = 'border-width, top, left, width, height'
        this.domMask.style.transitionProperty = 'all'
        this.domMask.style.transitionDuration = animate
        this.domMask.style.transitionTimingFunction = 'easeOut'
      } else {
        this.domMask.style.transitionProperty = ''
        this.domMask.style.transitionDuration = ''
        this.domMask.style.transitionTimingFunction = ''
      }
      const mr = this.domMask.getBoundingClientRect()
      this.domMask.style.backgroundColor = 'transparent'
      this.domMask.style.borderTopWidth = Math.max(0, this.y1) + 'px'
      this.domMask.style.borderBottomWidth = Math.max(0, mr.height - this.y2) + 'px'
      this.domMask.style.borderLeftWidth = Math.max(0, this.x1) + 'px'
      this.domMask.style.borderRightWidth = Math.max(0, mr.width - this.x2) + 'px'

      this.hideOrShowUiElements()
    } else {
      this.domMask.style.backgroundColor = this.maskColor
      this.domMask.style.borderTopWidth = '0'
      this.domMask.style.borderBottomWidth = '0'
      this.domMask.style.borderLeftWidth = '0'
      this.domMask.style.borderRightWidth = '0'
    }
  }

  hideOrShowUiElements () {
    const mouseRect = { x: this.mouseX, y: this.mouseY, width: 0, height: 0 }
    const spotlightRect = { x: this.x1, y: this.y1, width: this.x2 - this.x1, height: this.y2 - this.y1 }

    const tipsRect = this.domTips.getBoundingClientRect()
    const shouldHideTips = !this.doRectanglesOverlap(tipsRect, mouseRect) &&
      this.doRectanglesOverlap(tipsRect, spotlightRect)
    this.domTips.style.opacity = shouldHideTips ? '0' : '1'

    const xRect = this.domX.getBoundingClientRect()
    const shouldHideX = !this.doRectanglesOverlap(xRect, mouseRect) &&
      this.doRectanglesOverlap(xRect, spotlightRect)
    this.domX.style.opacity = shouldHideX ? '0' : '1'
  }

  doRectanglesOverlap (rect1, rect2) {
    // Get the coordinates of the rectangles
    const rect1Left = rect1.x
    const rect1Right = rect1.x + rect1.width
    const rect1Top = rect1.y
    const rect1Bottom = rect1.y + rect1.height

    const rect2Left = rect2.x
    const rect2Right = rect2.x + rect2.width
    const rect2Top = rect2.y
    const rect2Bottom = rect2.y + rect2.height

    // Check if one rectangle is on the left side of the other
    if (rect1Right < rect2Left || rect2Right < rect1Left) {
      return false
    }

    // Check if one rectangle is above the other
    if (rect1Bottom < rect2Top || rect2Bottom < rect1Top) {
      return false
    }

    // If none of the above conditions are met, the rectangles overlap
    return true
  }

  show () {
    if (!this.isShown) {
      this.isShown = true
      this.isScanning = false
      document.body.appendChild(this.domMask)
      this.domTips.style.display = 'block'
      document.addEventListener('keyup', this.keyupHandler)
      window.addEventListener('resize', this.resizeHandler)
    }
  }

  hide () {
    if (this.isShown) {
      document.removeEventListener('keydown', this.keyupHandler)
      window.removeEventListener('resize', this.resizeHandler)

      this.isScanning = false
      this.isShown = false
      this.x1 = this.x2 = this.y1 = this.y2 = null
      this.domRect.innerHTML = ''
      if (this.domResult && this.domResult.parentElement) {
        this.domResult.parentElement.removeChild(this.domResult)
        this.domResult = null
      }
      this.domMask.parentElement.removeChild(this.domMask)
      this.updateSpotLight(false)
    }
  }

  rescan () {
    this.isScanning = false
    this.domRect.innerHTML = ''
    if (this.domResult && this.domResult.parentElement) {
      this.domResult.parentElement.removeChild(this.domResult)
      this.domResult = null
    }
    this.updateSpotLight(true)
  }

  async scan () {
    if (this.domResult && this.domResult.parentElement) {
      this.domResult.parentElement.removeChild(this.domResult)
      this.domResult = null
    }
    let resImage
    let resText = ''
    let err = ''
    let successful = false
    const rect = {
      x: this.x1,
      y: this.y1,
      width: this.x2 - this.x1,
      height: this.y2 - this.y1
    }
    const scroll = {
      left: document.documentElement.scrollLeft,
      top: document.documentElement.scrollTop
    }
    try {
      const res = await apiNs.runtime.sendMessage({
        action: 'ACTION_CAPTURE',
        rect,
        scroll,
        devicePixelRatio: window.devicePixelRatio
      })
      successful = !res.err
      resImage = res.image
      if (successful && res.result && res.result.length) {
        resText = res.result[0].content
      } else {
        err = apiNs.i18n.getMessage('unable_to_decode_qr_code')
      }
    } catch (e) {
      console.log('error: ', e)
      err = e ? e.toString() : 'Unknown error'
    }
    this.showResult(err, resText, resImage, successful)
  }

  showResult (err, content, image, successful) {
    this.domResult = createElement(`<div style="display: block; border: none; border-radius: 4px;
    margin:0; padding: 0; background-color: white; word-break: break-all; position: fixed;
    top: 55%; left: 50%; transform: translateX(-50%); width: 25rem; max-width: 90%;
    box-shadow: black 0 0 10px; outline: white solid 2px"></div>`)
    const textEl = createElement(`<textarea rows="6" style="font-size: medium; font-family: sans-serif; width: calc(100% - 12px);
      word-break: break-all; border-width: 1px 0; border-color: #CCCCCC; border-style: solid; padding: 1px; margin: 6px; resize: none;
      color: #333; background-color: #F8F8F8; box-sizing: border-box;" placeholder="${err}" readonly>${content}</textarea>`)
    this.domResult.appendChild(textEl)

    const rr = this.domRect.getBoundingClientRect()
    const mr = this.domMask.getBoundingClientRect()

    if (image) {
      const [aW, aH] = [rr.width, rr.height]
      const scaleX = aW < mr.width * 0.8 ? (aW < mr.width * 0.5 ? mr.width * 0.5 / aW : 1) : mr.width * 0.8 / aW
      const scaleY = aH < mr.height / 2 * 0.8 ? (aH < mr.height * 0.25 ? mr.height * 0.25 / aH : 1) : mr.height / 2 * 0.8 / aH
      const scale = Math.min(scaleX, scaleY)
      const [bW, bH] = [aW * scale, aH * scale]

      const img = createElement('<img style="display: block; width: 100%; height: 100%">')
      img.src = image
      this.domRect.appendChild(img)
      this.updateSpotLight(true, mr.width / 2, mr.height / 4, bW, bH, '.1s')
    }

    const createBtn = (icon, text, href, handler) => {
      const btnStyle = 'display: inline-block; margin: 6px; font-size:14px; color:gray; cursor: pointer; text-decoration: underline; font-family: sans-serif;'
      const btn = createElement(`<a style="${btnStyle}"></a>`)
      const svg = createElement(icon)
      svg.style.marginRight = '0.1rem'
      btn.appendChild(svg)
      btn.appendChild(document.createTextNode(text))
      if (href) {
        btn.href = href
        btn.target = '_blank'
      }
      if (handler) {
        btn.addEventListener('click', handler)
      }
      const svgElement = btn.querySelector('svg')
      svgElement.style.width = '1rem'
      svgElement.style.height = '1rem'
      svgElement.style.verticalAlign = 'middle'
      svgElement.style.opacity = '0.8'
      return btn
    }

    if (successful && content) {
      this.domResult.appendChild(createBtn(copyIcon, apiNs.i18n.getMessage('copy_btn'), '', e => {
        e.preventDefault()
        e.stopPropagation()
        navigator.clipboard.writeText(content).then((res) => {
          e.target.innerText = apiNs.i18n.getMessage('copy_btn_copied')
        })
      }))

      if (isUrl(content)) {
        this.domResult.appendChild(createBtn(openUrlIcon, apiNs.i18n.getMessage('open_link_btn'), content, e => {
          e.stopPropagation()
          this.hide()
        }))
      }
    }

    this.domResult.appendChild(createBtn(refreshIcon, apiNs.i18n.getMessage('rescan_btn_label'), content, e => {
      e.preventDefault()
      e.stopPropagation()
      this.rescan()
    }))

    this.domResult.addEventListener('mousedown', e => e.stopPropagation())
    this.domMask.appendChild(this.domResult)
    textEl.select()
  }
}

if (!window._qrLite_RegionPicker) {
  // eslint-disable-next-line no-undef
  window._qrLite_RegionPicker = new Picker()
  window._qrLite_RegionPicker.init()
}

window._qrLite_RegionPicker.show()
