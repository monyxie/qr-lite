export function createElement (html) {
  const container = document.createElement('div')
  container.innerHTML = html
  return container.children[0]
}

export function query (selector) {
  return document.querySelector(selector)
}

export function addClass (cls, ...el) {
  el.forEach(a => {
    if (typeof a === 'string') {
      query(a).classList.add(cls)
    } else {
      a.classList.add(cls)
    }
  })
}

export function removeClass (cls, ...el) {
  el.forEach(a => {
    if (typeof a === 'string') {
      query(a).classList.remove(cls)
    } else {
      a.classList.remove(cls)
    }
  })
}
