export function isUrl (str) {
  return /^https?:\/\//i.test(str)
}

export async function sleep (ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })
}

export function escapeHtml (unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// https://stackoverflow.com/questions/12168909/blob-from-dataurl
export async function convertDataUriToBlob (dataURI) {
  // requires csp: connect-src data:
  return await (await fetch(dataURI)).blob()
}

export async function convertBlobToDataUri (blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener(
      'load',
      () => {
        resolve(reader.result)
      },
      false
    )
    reader.readAsDataURL(blob)
  })
}

/**
 * @param dataURI {string}
 * @param crop {{x,y,width,height}}
 * @return {Promise<OffscreenCanvas>}
 */
export async function createCanvasFromDataUri (dataURI, crop) {
  // https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas#browser_compatibility
  const params = crop ? [crop.x, crop.y, crop.width, crop.height] : []
  const bitmap = await createImageBitmap(await convertDataUriToBlob(dataURI), ...params)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const context = canvas.getContext('2d')
  context.drawImage(bitmap, 0, 0)
  return canvas
}

export function randomStr (len) {
  let str = ''
  const a = 'a'.charCodeAt(0)
  const z = 'z'.charCodeAt(0)
  for (let i = 0; i < len; i++) {
    str += String.fromCharCode(a + Math.floor(Math.random() * (z - a + 1)))
  }
  return str
}
