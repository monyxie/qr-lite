import { getText, renderTemplate } from '../utils/i18n'
import { addClass, query as $, removeClass } from '../utils/dom'

(() => {
  document.title = getText('grant_permissions_window_title')
  renderTemplate($('#template'))
  $('#refresh').addEventListener('click', () => window.location.reload())
  $('#close').addEventListener('click', () => window.close())

  navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      addClass('hidden', $('#initial'))
      removeClass('hidden', $('#granted'))
      addClass('hidden', $('#blocked'))
    })
    // eslint-disable-next-line n/handle-callback-err
    .catch((err) => {
      addClass('hidden', $('#initial'))
      addClass('hidden', $('#granted'))
      removeClass('hidden', $('#blocked'))
    })
})()
