import { createElements } from '../utils/dom'

class Picker {
  constructor (browser) {
    this.browser = browser
    this.x1 = this.x2 = this.y1 = this.y2 = null
    this.isDragging = false
    this.maskColor = 'rgba(0,0,0,0.5)'
  }

  init () {
    this.keyupHandler = (event) => {
      if (event.key === 'Escape' && this.isShown) {
        event.preventDefault()
        event.stopPropagation()
        this.hide()
      }
    }

    this.domMask = createElements(`
    <div style="position: fixed; top: 0; left: 0; z-index: 2147483647; width: 100%; height: 100%;
    box-sizing: border-box; background-color: ${this.maskColor}; border-color: ${this.maskColor}; border-style: solid; border-width: 0;">
    </div>`)[0]

    this.domTips = createElements(`
    <div style="padding: 4px; position: fixed; left: 0; top: 0; color: white;
    user-select: none; font-size: 14px; font-family: sans-serif; min-width: 100px;">
    ${this.browser.i18n.getMessage('scan_region_picker_tips_html')}</div>`)[0]

    this.domRect = createElements('<div style="width: 100%; height: 100%; outline: white solid 2px; border-radius: 4px;"></div>')[0]
    this.domX = createElements('<div style="position: fixed; width: 36px; height: 36px; text-align: center; line-height: 36px; right: 0; top: 0;margin: 4px; color: #ccc; font-family: sans-serif; font-size: 36px; cursor: pointer;">&times;</div>')[0]

    this.domMask.appendChild(this.domRect)
    this.domMask.appendChild(this.domTips)
    this.domMask.appendChild(this.domX)

    this.domX.addEventListener('click', () => this.hide())

    this.domMask.addEventListener('mousedown', event => {
      // only handle left-click
      if (event.button !== 0) {
        return
      }
      this.isMouseDown = true
      this.startX = event.clientX
      this.startY = event.clientY
      if (this.domTips && this.domTips.parentElement) {
        this.domTips.parentElement.removeChild(this.domTips)
      }
    })
    this.domMask.addEventListener('mouseup', event => {
      // only handle left-click
      if (event.button !== 0) {
        return
      }
      this.isMouseDown = false
      if (this.isDragging) {
        this.isDragging = false
        this.updateSelection()
        this.scan()
      }
    })

    this.domMask.addEventListener('mousemove', event => {
      // this.domTips.style.top = event.clientY + 'px'
      // this.domTips.style.left = (event.clientX + 20) + 'px'
      if (this.isMouseDown) {
        this.domRect.innerHTML = ''
        this.isDragging = true
        this.currentX = event.clientX
        this.currentY = event.clientY
        this.updateSelection()
      }
    })

    document.addEventListener('keyup', this.keyupHandler)
  }

  show () {
    if (!this.isShown) {
      this.isShown = true
      // This line disables scrolling when the picker is active
      // but it causes issues in Google Image search so it's commented out for now
      // document.scrollingElement.style.overflow = 'hidden'
      document.body.appendChild(this.domMask)
    }
  }

  updateSelection () {
    if (!this.startX || !this.currentX) {
      this.domMask.style.borderWidth = '0'
      this.domMask.style.backgroundColor = this.maskColor
      return
    }
    if (this.startX < this.currentX) {
      this.x1 = this.startX
      this.x2 = this.currentX
    } else {
      this.x2 = this.startX
      this.x1 = this.currentX
    }

    if (this.startY < this.currentY) {
      this.y1 = this.startY
      this.y2 = this.currentY
    } else {
      this.y2 = this.startY
      this.y1 = this.currentY
    }

    this.domMask.style.backgroundColor = 'transparent'
    this.domMask.style.borderTopWidth = this.y1 + 'px'
    this.domMask.style.borderBottomWidth = (this.domMask.getBoundingClientRect().height - this.y2) + 'px'
    this.domMask.style.borderLeftWidth = this.x1 + 'px'
    this.domMask.style.borderRightWidth = (this.domMask.getBoundingClientRect().width - this.x2) + 'px'
  }

  hide () {
    if (this.isShown) {
      this.isMouseDown = false
      this.isDragging = false
      this.isShown = false
      this.currentX = this.currentY = this.x1 = this.x2 = this.y1 = this.y2 = null
      this.domRect.innerHTML = ''
      if (this.domResult && this.domResult.parentElement) {
        this.domResult.parentElement.removeChild(this.domResult)
      }
      this.domMask.parentElement.removeChild(this.domMask)
      this.updateSelection()
      document.scrollingElement.style.overflow = ''
      document.removeEventListener('keydown', this.keyupHandler)
    }
  }

  async scan () {
    const that = this
    if (this.domResult && this.domResult.parentElement) {
      this.domResult.parentElement.removeChild(this.domResult)
      this.domResult = undefined
    }
    let resImage
    let resText = ''
    let resInfo = ''
    let successful = false
    const rect = {
      x: document.documentElement.scrollLeft + this.x1,
      y: document.documentElement.scrollTop + this.y1,
      width: this.x2 - this.x1,
      height: this.y2 - this.y1
    }
    try {
      const res = await this.browser.runtime.sendMessage({
        action: 'ACTION_CAPTURE',
        rect
      })
      successful = !res.err
      resImage = res.image
      if (successful) {
        resText = res.result.text
      } else {
        resInfo = this.browser.i18n.getMessage('unable_to_decode_qr_code')
      }
    } catch (e) {
      console.error(e)
      resInfo = e.toString()
    }

    this.domResult = createElements(`<div style="display: block; border: none; border-radius: 0;
    margin:0; padding: 0; background-color: white; word-break: break-all; position: absolute; top: 0; left: 0; width: 100%"></div>`)[0]
    const textEl = createElements(`<textarea style="font-size: 14px; font-family: sans-serif; width: calc(100% - 12px);
      word-break: break-all; border-width: 1px 0; border-color: #CCCCCC; border-style: solid; padding: 1px; margin: 6px; resize: none;
      color: #333; background-color: #F8F8F8; box-sizing: border-box;" placeholder="${resInfo}" readonly>${resText}</textarea>`)[0]
    this.domResult.appendChild(textEl)

    if (resImage) {
      const img = createElements('<img style="position: static; display: block; width: 100%; height: 100%" alt="">')[0]
      img.src = resImage
      this.domRect.appendChild(img)
    }

    if (successful) {
      const btnStyle = 'display: inline-block; margin: 6px; font-size:14px; color:gray; cursor: pointer; text-decoration: underline; font-family: sans-serif;'

      const copyBtn = createElements(`<a style="${btnStyle}">${this.browser.i18n.getMessage('copy_btn')}</a>`)[0]
      copyBtn.addEventListener('click', e => {
        this.browser.runtime.sendMessage({
          action: 'ACTION_COPY_TEXT',
          text: resText
        }).then(() => {
          copyBtn.innerText = this.browser.i18n.getMessage('copy_btn_copied')
        })
      })
      this.domResult.appendChild(copyBtn)

      if (/^https?:\/\//.test(resText)) {
        const openBtn = createElements(`<a style="${btnStyle}" target="_blank">${this.browser.i18n.getMessage('open_link_btn')}</a>`)[0]
        openBtn.href = resText
        openBtn.addEventListener('click', e => {
          that.hide()
        })
        this.domResult.appendChild(openBtn)
      }
    }

    this.domResult.addEventListener('mousedown', e => e.stopPropagation())

    // Show the scan result on top of the image if there's enough space, otherwise show it at the top of the page
    if ((this.x2 - this.x1 < 200) || (this.y2 - this.y1 < 50)) {
      this.domResult.style.position = 'fixed'
      this.domResult.style.top = '0'
      this.domResult.style.left = '0'
      this.domResult.style.margin = '4px'
      this.domResult.style.width = '50%'
      this.domMask.appendChild(this.domResult)
    } else {
      this.domRect.appendChild(this.domResult)
    }
  }
}

if (!window._qrLite_RegionPicker) {
  // eslint-disable-next-line no-undef
  window._qrLite_RegionPicker = new Picker(browser)
  window._qrLite_RegionPicker.init()
}

window._qrLite_RegionPicker.show()
