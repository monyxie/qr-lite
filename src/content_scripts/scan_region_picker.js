class Picker {
  constructor (browser) {
    this.browser = browser
    this.x1 = this.x2 = this.y1 = this.y2 = null
  }

  init () {
    const domMask = document.createElement('div')
    const domTips = document.createElement('p')
    domMask.innerHTML = '<div class="qr-lite-mask-top"></div>' +
      '<div class="qr-lite-mask-middle" style="margin:0;width:100%;display:flex;justify-content:space-between;user-select:none;">' +
      '<div class="qr-lite-mask-left" style="margin:0;height:100%;float:left;user-select:none;"></div>' +
      '<div class="qr-lite-rect" style="margin:0;height:100%;float:left;user-select:none;"></div>' +
      '<div class="qr-lite-mask-right" style="margin:0;height:100%;user-select:none;"></div>' +
      '</div>' +
      '<div class="qr-lite-mask-bottom" style="margin:0;width:100%;user-select:none;"></div>'

    this.domMask = domMask
    this.domRect = domMask.getElementsByClassName('qr-lite-rect')[0]
    this.domMaskTop = domMask.getElementsByClassName('qr-lite-mask-top')[0]
    this.domMaskMiddle = domMask.getElementsByClassName('qr-lite-mask-middle')[0]
    this.domMaskLeft = domMask.getElementsByClassName('qr-lite-mask-left')[0]
    this.domMaskRight = domMask.getElementsByClassName('qr-lite-mask-right')[0]
    this.domMaskMiddle = domMask.getElementsByClassName('qr-lite-mask-middle')[0]
    this.domMaskBottom = domMask.getElementsByClassName('qr-lite-mask-bottom')[0]
    this.keyupHandler = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        this.hide()
      }
    }

    this.domMask.style.position = 'fixed'
    this.domMask.style.top = '0px'
    this.domMask.style.left = '0px'
    this.domMask.style.zIndex = '9999'
    this.domMask.style.width = '100%'
    this.domMask.style.height = '100%'

    domTips.style.position = 'fixed'
    domTips.style.left = '0px'
    domTips.style.top = '0px'
    domTips.style.color = 'white'
    domTips.style.backgroundColor = 'rgba(0,0,0,0.75)'
    domTips.style.zIndex = '9998'
    domTips.style.border = '1px solid white'
    domTips.style.userSelect = 'none'
    domTips.style.fontSize = '14px'
    domTips.style.fontFamily = 'Sans Serif'
    domTips.innerHTML = this.browser.i18n.getMessage('scan_region_picker_tips_html')
    this.domMaskTop.style.backgroundColor = 'rgba(0,0,0,0.5)'
    this.domMaskTop.style.height = '100%'

    this.domMask.appendChild(domTips)

    this.domMask.addEventListener('mousedown', event => {
      this.isMouseDown = true
      this.startX = event.clientX
      this.startY = event.clientY
    })
    this.domMask.addEventListener('mouseup', event => {
      this.isMouseDown = false
      if (this.isDragged) {
        this.isDragged = false
        this.updateSelection()

        const rect = {
          x: document.documentElement.scrollLeft + this.x1,
          y: document.documentElement.scrollTop + this.y1,
          width: this.x2 - this.x1,
          height: this.y2 - this.y1
        }
        // console.log('capturing image: ', rect)
        this.browser.runtime.sendMessage({
          action: 'ACTION_CAPTURE',
          rect
        }).then(response => {
          const image = document.createElement('img')
          image.src = response.dataUri
          image.style.display = 'block'
          image.style.margin = '0'
          image.style.padding = '0'
          image.style.position = 'static'
          image.style.top = '0'
          image.style.left = '0'
          image.style.width = rect.width + 'px'
          image.style.height = rect.height + 'px'
          this.domRect.appendChild(image)
        }).catch(e => {
          console.log('image capture failed: ', e)
        })
      }
    })

    this.domMask.addEventListener('mousemove', event => {
      domTips.style.top = event.clientY + 'px'
      domTips.style.left = (event.clientX + 20) + 'px'
      if (this.isMouseDown) {
        this.domRect.innerHTML = ''
        this.isDragged = true
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
      document.scrollingElement.style.overflow = 'hidden'
      document.body.appendChild(this.domMask)
    }
  }

  updateSelection () {
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

    // this.domMask.style.width = window.innerWidth + 'px'
    // this.domMask.style.height = window.innerHeight + 'px'

    this.domMaskTop.style.backgroundColor =
      this.domMaskLeft.style.backgroundColor =
        this.domMaskRight.style.backgroundColor =
          this.domMaskBottom.style.backgroundColor = 'rgba(0,0,0,0.5)'
    this.domRect.style.backgroundColor = 'transparent'
    this.domMaskTop.style.height = this.y1 + 'px'
    this.domMaskMiddle.style.height = (this.y2 - this.y1) + 'px'
    this.domMaskBottom.style.height = (window.innerHeight - this.y2) + 'px'
    this.domMaskLeft.style.width = this.x1 + 'px'
    this.domRect.style.width = (this.x2 - this.x1) + 'px'
    this.domMaskRight.style.width = (window.innerWidth - this.x2) + 'px'
  }

  hide () {
    if (this.isShown) {
      this.isShown = false
      this.domRect.style.backgroundColor = 'rgba(0,0,0,0.5)'
      this.currentX = this.currentY = this.x1 = this.x2 = this.y1 = this.y2 = null
      this.domRect.innerHTML = ''
      this.domMask.parentElement.removeChild(this.domMask)
      document.scrollingElement.style.overflow = ''
      document.removeEventListener('keydown', this.keyupHandler)
    }
  }
}

if (!window._qrLite_RegionPicker) {
  // eslint-disable-next-line no-undef
  window._qrLite_RegionPicker = new Picker(browser)
  window._qrLite_RegionPicker.init()
}

window._qrLite_RegionPicker.show()
