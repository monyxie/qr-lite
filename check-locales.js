const fs = require('fs')

function readDirectory (dirPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        reject(err)
        return
      }

      resolve(files)
    })
  })
}

function readJSONFile (filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      } else {
        try {
          const jsonData = JSON.parse(data)
          resolve(jsonData)
        } catch (parseErr) {
          reject(parseErr)
        }
      }
    })
  })
}

(async function main () {
  const srcMessages = (await readJSONFile('./src/_locales/en/messages.json'))
  const locales = (await readDirectory('./src/_locales')).filter(a => a !== 'en')
  for (const locale of locales) {
    const dstMessages = await readJSONFile(`./src/_locales/${locale}/messages.json`)
    let untranslated = 0
    let missing = 0
    for (const key in srcMessages) {
      if (!(key in dstMessages)) {
        missing++
        console.error(`${locale}: missing key "${key}"`)
      } else if (dstMessages[key].message === srcMessages[key].message) {
        untranslated++
        console.warn(`${locale}: untranslated key "${key}"`)
      }
    }
    console.log(`${locale}: ${missing} missing, ${untranslated} untranslated`)
  }
})()
