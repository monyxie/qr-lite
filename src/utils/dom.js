export function createElements (html) {
  const container = document.createElement('div')
  container.innerHTML = html
  return container.children
}
