export function isUrl (str) {
  return /^https?:\/\//i.test(str)
}

export async function sleep (ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })
}
