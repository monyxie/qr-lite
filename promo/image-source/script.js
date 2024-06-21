(async function main () {
  const url = new URL(window.location.href)
  const defaultLocale = 'en-US'
  const locale = url.searchParams.get('locale') || defaultLocale

  // const variant = document.querySelector('[data-variant]')?.dataset?.variant
  const messages = await fetch(`../_locales/${locale}/messages.json`).then(r => r.json())
  const defaultMessages = locale === defaultLocale
    ? messages
    : await fetch(`../_locales/${defaultLocale}/messages.json`).then(r => r.json())

  function escapeHtml (unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function renderTemplate (domTemplate) {
    const template = domTemplate.innerHTML
    domTemplate.parentElement.innerHTML = template.replace(/{{__MSG_(\w+)__}}/g, function (match, key, offset) {
      const content = messages[key]?.message || defaultMessages[key]?.message || ''
      // escape html special chars except for keys that explicitly ends with 'html'
      return key.endsWith('html') ? content : escapeHtml(content)
    })
  }

  renderTemplate(document.getElementById('template'))

  document.querySelectorAll('.autoscale').forEach(el => {
    const elRect = el.getBoundingClientRect()
    const pRect = el.parentElement.getBoundingClientRect()
    if (elRect.width > pRect.width) {
      const r = pRect.width / elRect.width
      el.style.cssText = `transform: scale(${r}, ${r})`
    }
  })

  let variant = url.searchParams.get('variant')
  if (!variant) variant = window.defaultVariant
  document.querySelectorAll('[data-variant]').forEach(el => {
    if (!variant) variant = el.dataset?.variant
    if (el.dataset.variant !== variant) {
      el.remove()
    }
  })
})()
