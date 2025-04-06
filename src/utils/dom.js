export function createElement (html) {
  const container = document.createElement('div')
  container.innerHTML = html
  return container.children[0]
}

export function query (selector) {
  return document.querySelector(selector)
}

export function queryAll (selector) {
  return document.querySelectorAll(selector)
}

export function addClass (cls, ...el) {
  el.forEach(a => {
    if (typeof a === 'string') {
      queryAll(a).forEach(el => el.classList.add(cls))
    } else if (a) {
      a.classList.add(cls)
    }
  })
}

export function removeClass (cls, ...el) {
  el.forEach(a => {
    if (typeof a === 'string') {
      queryAll(a).forEach(el => el.classList.remove(cls))
    } else if (a) {
      a.classList.remove(cls)
    }
  })
}
