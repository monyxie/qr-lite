export function createElements (html) {
  const container = document.createElement('div')
  container.innerHTML = html
  return container.children
}

export function query (selector) {
  return document.querySelector(selector)
}

export function addClass (cls, ...el) {
  el.forEach(a => (typeof a === 'string' ? query(a) : a).classList.add(cls))
}

export function removeClass (cls, ...el) {
  el.forEach(a => (typeof a === 'string' ? query(a) : a).classList.remove(cls))
}
