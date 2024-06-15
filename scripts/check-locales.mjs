import util from 'node:util'
import fs from 'node:fs'
import { exec, spawn } from 'node:child_process'
import path from 'node:path'

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

async function extractKeysFromSource () {
  // check "rg" availability
  await util.promisify(exec)('which rg')

  const args = [
    '-e', '__MSG_(\\w+)__',
    '-e', 'apiNs\\.i18n\\.getMessage\\s*\\(\\s*\'(\\w+)\'',
    'src',
    '--glob', 'src/**/*.{js,json,html}',
    '--glob', '!src/{_locales,icons,opencv}/**',
    '--multiline',
    '--no-filename',
    '--no-heading',
    '--no-line-number',
    '--only-matching',
    '--replace', '$1$2'
  ]

  return await new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const rg = spawn('rg', args)
    rg.stdout.on('data', (data) => {
      stdout += data
    })
    rg.stderr.on('data', (data) => {
      stderr += data
    })
    rg.on('close', code => {
      if (code !== 0) {
        reject(new Error('rg command failed to run: ' + stderr))
      }
      const map = stdout.split('\n').reduce((a, c) => {
        if (c !== '') {
          a[c] = 1
        }
        return a
      }, {})
      resolve(Object.keys(map))
    })
  })
}

(async function main () {
  process.chdir(path.dirname(import.meta.dirname))

  // ================= extract message keys from source code =================
  let keysInSource
  try {
    keysInSource = await extractKeysFromSource()
  } catch (e) {
    console.log('\x1b[31m%s\x1b[0m', 'Error extracting keys from source code: ' + e)
    return
  }

  // ================= check canonical  === (source) locale =================

  const srcLocale = 'en'
  const srcMessages = (await readJSONFile(`./src/_locales/${srcLocale}/messages.json`))

  let unused = 0
  let missing = 0
  for (const key in srcMessages) {
    if (keysInSource.indexOf(key) === -1) {
      unused++
      console.log('\x1b[33m%s\x1b[0m', `SRC(${srcLocale}): "${key}" is unused`)
    }
  }

  // predefined messages. amongst these "version" is defined by this project.
  const predefined = ['extension_id', 'ui_locale', 'bidi_dir', 'bidi_reversed_dir', 'bidi_start_edge', 'bidi_end_edge', 'version']
  for (const key of keysInSource) {
    if (!(key in srcMessages) && predefined.indexOf(key) === -1) {
      missing++
      console.log('\x1b[33m%s\x1b[0m', `SRC(${srcLocale}): "${key}" is missing`)
    }
  }
  console.log((unused + missing === 0) ? '\x1b[32m%s\x1b[0m' : '\x1b[31m%s\x1b[0m', `SRC(${srcLocale}): ${missing} missing, ${unused} unused`)

  // ================= check other locales =================

  const locales = (await readDirectory('./src/_locales')).filter(a => a !== srcLocale)
  for (const locale of locales) {
    const dstMessages = await readJSONFile(`./src/_locales/${locale}/messages.json`)
    let missing = 0
    let untranslated = 0
    let redundant = 0
    let other = 0
    for (const key in srcMessages) {
      if (!(key in dstMessages)) {
        missing++
        console.log('\x1b[33m%s\x1b[0m', `${locale}: "${key}" is missing`)
      } else {
        if (dstMessages[key].message === srcMessages[key].message && !(dstMessages[key].description?.indexOf('[keep-original]') >= 0)) {
          untranslated++
          console.log('\x1b[33m%s\x1b[0m', `${locale}: "${key}" is untranslated`)
        } else if ((dstMessages[key].description?.indexOf('[keep-original]') >= 0) && dstMessages[key].message !== srcMessages[key].message) {
          other++
          console.log('\x1b[33m%s\x1b[0m', `${locale}: "${key}" is marked as [keep-original] but different from the source`)
        }

        // check if number of placeholders is the same as source
        const dstPh = dstMessages[key].placeholders ? Object.keys(dstMessages[key].placeholders).length : 0
        const srcPh = srcMessages[key].placeholders ? Object.keys(srcMessages[key].placeholders).length : 0
        if (dstPh !== srcPh) {
          other++
          console.log('\x1b[33m%s\x1b[0m', `${locale}: "${key}" has ${dstPh} placeholder(s) but the source has ${srcPh}`)
        }
      }
    }
    for (const key in dstMessages) {
      if (!(key in srcMessages)) {
        redundant++
        console.log('\x1b[33m%s\x1b[0m', `${locale}: "${key}" is redundant`)
      }
    }
    console.log((untranslated + missing + redundant + other === 0) ? '\x1b[32m%s\x1b[0m' : '\x1b[31m%s\x1b[0m', `${locale}: ${missing} missing, ${untranslated} untranslated, ${redundant} redundant, ${other} other issues`)
  }
})()
