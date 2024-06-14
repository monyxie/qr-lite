import { renderTemplate } from '../utils/i18n'
import { addClass, query as $, removeClass } from '../utils/dom'
import { apiNs } from '../utils/compat'

(async () => {
  let requestFunction
  let selector
  switch (window.location.search) {
    case '?camera':
      selector = '.grant-camera'
      requestFunction = () => {
        return navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }
      break
    case '?all-urls':
      selector = '.grant-all-urls'
      requestFunction = () => {
        return apiNs.permissions.request({ origins: ['<all_urls>'] })
      }
      break
    default:
      return
  }

  document.title = apiNs.i18n.getMessage('grant_permissions_window_title')
  renderTemplate($('#template'))
  removeClass('hidden', selector)

  $('#refresh').addEventListener('click', () => window.location.reload())
  $('#close').addEventListener('click', () => window.close())
  $('#trigger').addEventListener('click', async () => {
    let ok
    try {
      ok = await requestFunction()
    // eslint-disable-next-line n/handle-callback-err
    } catch (err) { }

    if (ok) {
      addClass('hidden', '#initial')
      removeClass('hidden', '#granted')
      addClass('hidden', '#blocked')
    } else {
      addClass('hidden', '#initial')
      addClass('hidden', '#granted')
      removeClass('hidden', '#blocked')
    }
  })

  removeClass('hidden', `#initial ${selector}`)
})()
