class Picker {
  constructor (browser) {
    this.browser = browser
    this.x1 = this.x2 = this.y1 = this.y2 = null
    this.isDragging = false
    this.maskColor = 'rgba(0,0,0,0.5)'
  }

  init () {
    const domMask = document.createElement('div')
    const domTips = document.createElement('p')
    const domRect = document.createElement('div')

    this.domMask = domMask
    this.domRect = domRect

    this.keyupHandler = (event) => {
      if (event.key === 'Escape' && this.isShown) {
        event.preventDefault()
        event.stopPropagation()
        this.hide()
      }
    }

    this.domRect.style.width = '100%'
    this.domRect.style.height = '100%'
    this.domRect.style.outline = 'white solid 2px'
    this.domRect.style.borderRadius = '4px'

    this.domMask.style.position = 'fixed'
    this.domMask.style.top = '0px'
    this.domMask.style.left = '0px'
    this.domMask.style.zIndex = '2147483647'
    this.domMask.style.width = '100%'
    this.domMask.style.height = '100%'

    this.domMask.style.boxSizing = 'border-box'
    this.domMask.style.backgroundColor = this.maskColor
    this.domMask.style.borderColor = this.maskColor
    this.domMask.style.borderStyle = 'solid'
    this.domMask.style.borderWidth = '0'

    domTips.style.padding = '4px'
    domTips.style.position = 'fixed'
    domTips.style.left = '0px'
    domTips.style.top = '0px'
    domTips.style.color = 'white'
    domTips.style.backgroundColor = 'rgba(0,0,0,0.75)'
    domTips.style.zIndex = '9998'
    domTips.style.border = '1px solid white'
    domTips.style.borderRadius = '2px'
    domTips.style.userSelect = 'none'
    domTips.style.fontSize = '14px'
    domTips.style.fontFamily = 'Sans Serif'
    domTips.style.minWidth = '100px'
    domTips.innerHTML = this.browser.i18n.getMessage('scan_region_picker_tips_html')

    this.domMask.appendChild(domRect)
    this.domMask.appendChild(domTips)
    this.domMask.addEventListener('mousedown', event => {
      // only handle left-click
      if (event.button !== 0) {
        return
      }
      this.isMouseDown = true
      this.startX = event.clientX
      this.startY = event.clientY
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
      document.scrollingElement.style.overflow = 'hidden'
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
      this.domMask.parentElement.removeChild(this.domMask)
      this.updateSelection()
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
