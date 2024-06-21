/**
 * This script generates promotional images for extension stores.
 */

import puppeteer from 'puppeteer'
import path from 'node:path'
import fs from 'node:fs'
import handler from 'serve-handler'
import http from 'node:http'

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

let browser = null
async function getBrowser () {
  if (!browser) {
    browser = await puppeteer.launch()
  }
  return browser
}

async function generateImage (url, width, height, output) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width, height })
  await page.goto(url, { waitUntil: 'networkidle0' })
  await page.screenshot({ path: output })
  await page.close()
}

async function startHttpServer (publicDir) {
  const server = http.createServer((request, response) => {
    // You pass two more arguments for config and middleware
    // More details here: https://github.com/vercel/serve-handler#options
    return handler(request, response, {
      public: publicDir,
      cleanUrls: false,
      headers: [
        {
          source: '**/*.*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store, no-cache, must-revalidate, max-age=0'
            },
            { key: 'Pragma', value: 'no-cache' },
            { key: 'Expires', value: '0' }
          ]
        }
      ]
    })
  })

  const port = 30012
  const url = `http://localhost:${port}`
  server.listen(port, () => {
    console.log(`HTTP server running at ${url}`)
  })
  return url
}

(async function main () {
  const scriptDir = import.meta.dirname
  console.log(
    'WARNING! The project root will be served on a local HTTP server'
  )
  const baseUrl = await startHttpServer(path.dirname(scriptDir))
  if (process.argv.indexOf('--serve') !== -1) {
    return
  }

  process.chdir(scriptDir)

  const configs = [
    {
      source: 'promo-banner-440x280.html',
      width: 440,
      height: 280
    },
    {
      source: 'promo-marquee-1400x560.html',
      width: 1400,
      height: 560
    },
    {
      source: 'promo-screenshot-1280x800.html',
      width: 1280,
      height: 800,
      variant: 'generator'
    },
    {
      source: 'promo-screenshot-1280x800.html',
      width: 1280,
      height: 800,
      variant: 'scanner'
    },
    {
      source: 'promo-screenshot-1280x800.html',
      width: 1280,
      height: 800,
      variant: 'history'
    }
  ]

  const locales = await readDirectory('./_locales')

  for (const item of configs) {
    for (const locale of locales) {
      const url = new URL(`${baseUrl}/promo/image-source/${item.source}`)
      if (item.variant) {
        url.searchParams.set('variant', item.variant)
      }
      url.searchParams.set('locale', locale)
      const output =
        scriptDir +
        '/generated-images/' +
        locale +
        '/' +
        item.source.replace(/\.html?$/, item.variant ? `-${item.variant}.png` : '.png')
      const outputDir = path.dirname(output)
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      try {
        await generateImage(url, item.width, item.height, output)
        console.log(`OK ! ${item.source} => ${output}`)
      } catch (e) {
        console.log(`ERR! ${item.source} => ${output} : ` + e)
      }
    }
  }

  if (browser) {
    await browser.close()
  }
  process.exit(0)
})()
