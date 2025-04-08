import { renderTemplate } from '../utils/i18n'
import { query as $, addClass } from '../utils/dom'
import { apiNs, storage, openShortcutSettings, canOpenShortcutSettings } from '../utils/compat'

(async () => {
  document.title = apiNs.i18n.getMessage('settings_window_title')
  const searchParams = (new URL(location.href)).searchParams
  if (searchParams.get('minimal') === 'true') {
    addClass('minimal', 'body')
  }

  renderTemplate($('#template'))

  // define individual setting items
  const items = {
    soundEnabled: {
      dom: $('#soundEnabledCheckbox'),
      fromStorage: (el, value) => { el.checked = value === '1' },
      toStorage: (el) => el.checked ? '1' : '0'
    }
  }

  // setup change listener and populate existing value
  const settings = await storage.get(['soundEnabled'])
  for (const key in items) {
    items[key].fromStorage(items[key].dom, settings[key])
    items[key].dom.addEventListener('change', (e) => {
      storage.set({ [key]: items[key].toStorage(items[key].dom) })
    })
  }

  // setup storage change listener in case the values are changed in other places
  apiNs.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') {
      return
    }
    for (const changedKey in changes) {
      for (const key in items) {
        if (changedKey === key) {
          items[key].fromStorage(items[key].dom, changes[changedKey].newValue)
        }
      }
    }
  })

  if (!canOpenShortcutSettings()) {
    $('#configKeyboardShortcutsBtn').style.display = 'none'
  } else {
    $('#configKeyboardShortcutsBtn').addEventListener('click', (e) => {
      openShortcutSettings()
    })
  }
})()
