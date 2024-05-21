import { apiNs } from './compat'
import { escapeHtml } from './misc'

export function getText (...args) {
  return apiNs.i18n.getMessage(...args)
}

export function renderTemplate (domTemplate) {
  const template = domTemplate.innerHTML
  const messages = { version: apiNs.runtime.getManifest().version }
  domTemplate.parentElement.innerHTML = template.replace(/{{__MSG_(\w+)__}}/g, function (match, key, offset) {
    const content = messages[key] || getText(key)
    // escape html special chars except for keys that explicitly ends with 'html'
    return key.endsWith('html') ? content : escapeHtml(content)
  })
}
