import { confirm, checkbox, input, password } from '@inquirer/prompts'
import jwt from 'jsonwebtoken'
import fs from 'node:fs'

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

class AmoUpdater {
  constructor () {
    this.key = process.env.AMO_JWT_KEY
    this.secret = process.env.AMO_JWT_SECRET
  }

  async genToken () {
    console.log('Get your key and secret at https://addons.mozilla.org/en-US/developers/addon/api/key/')
    if (!this.key) {
      this.key = await input({ message: 'Key' })
    }
    if (!this.secret) {
      this.secret = await password({ message: 'Secret' })
    }

    const issuedAt = Math.floor(Date.now() / 1000)
    const payload = {
      iss: this.key,
      jti: Math.random().toString(),
      iat: issuedAt,
      exp: issuedAt + 60
    }

    const token = jwt.sign(payload, this.secret, { algorithm: 'HS256' })
    return token
  }

  async getDetail () {
    const response = await fetch(`${this.getBaseUrl()}/addons/addon/${this.getExtensionId()}/`, {
      method: 'GET'
    })

    if (response.ok) {
      return await response.json()
    } else {
      throw new Error('Get detail failed')
    }
  }

  async updateMetadata () {
    const allLocales = (await readDirectory('./promo/_locales'))
    const locales = await checkbox({
      message: 'Select the locales you wish to update',
      choices: allLocales.map(locale => ({ name: locale, value: locale }))
    })
    if (locales.length === 0) {
      console.log('No locales selected')
      return
    }

    // build request body
    const body = { summary: {}, description: {} }
    for (const locale of locales) {
      const messages = await readJSONFile(`./promo/_locales/${locale}/messages.json`)
      body.summary[locale] = messages.amo_summary.message
      body.description[locale] = messages.amo_description.message
    }

    const token = await this.genToken()
    const response = await fetch(`${this.getBaseUrl()}/addons/addon/${this.getExtensionId()}/`, {
      method: 'PATCH',
      headers: {
        Authorization: 'JWT ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    console.log(await response.json())
    if (response.ok) {
      console.log('Update successful')
    } else {
      console.error('Update failed')
    }
  }

  async updatePreviews () {
    const detail = await this.getDetail()
    const files = [
      './promo/generated-images/en-US/promo-screenshot-1280x800-generator.png',
      './promo/generated-images/en-US/promo-screenshot-1280x800-scanner.png',
      './promo/generated-images/en-US/promo-screenshot-1280x800-history.png'
    ]
    // check if files exist
    for (const file of files) {
      if (!fs.existsSync(file)) {
        console.error(`File ${file} does not exist`)
        return
      }
    }

    const token = await this.genToken()

    if (detail.previews.length > 0 && await confirm({ message: `Delete the existing ${detail.previews.length} previews?` })) {
      for (const preview of detail.previews) {
        const url = `${this.getBaseUrl()}/addons/addon/${this.getExtensionId()}/previews/${preview.id}`

        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            Authorization: 'JWT ' + token
          }
        })
        if (!response.ok) {
          console.log(await response.json())
          console.error('Delete failed, this could just be a cache issue')
          return
        }
      }
    }

    let position = 0
    for (const file of files) {
      console.log('Uploading ' + file + '...')
      const formData = new FormData()
      formData.append('image', await fs.openAsBlob(file), 'image.png')
      formData.append('position', position++)
      const url = `${this.getBaseUrl()}/addons/addon/${this.getExtensionId()}/previews/`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: 'JWT ' + token
        },
        body: formData
      })

      if (!response.ok) {
        console.log(await response.json())
        console.error('Uploading failed')
        return
      }
    }
  }

  getBaseUrl () {
    return 'https://addons.mozilla.org/api/v5'
  }

  getExtensionId () {
    return 'qr-lite'
  }

  async checkSiteStatus () {
    console.log('Checking AMO site status')
    const response = await fetch(`${this.getBaseUrl()}/site/`, {
      method: 'GET'
    })
    const data = await response.json()
    return data.read_only === false
  }

  async start () {
    if (this.checkSiteStatus()) {
      if (await confirm({ message: 'Update title and description?' })) {
        this.updateMetadata()
      }
      if (await confirm({ message: 'Update screenshots?' })) {
        this.updatePreviews()
      }
    }
  }
}

class MsEdgeUpdater {
  constructor () {
    this.clientId = process.env.MSEDGE_CLIENT_ID
    this.apiKey = process.env.MSEDGE_API_KEY
    this.productId = 'b02fb749-6962-4a61-8110-9f92459fc623'
    this.accessToken = null
  }

  async getCredentials () {
    console.log('Get your credentials at https://partner.microsoft.com/en-us/dashboard/microsoftedge/publishapi')
    if (!this.clientId) {
      this.clientId = await input({ message: 'MsEdge Client ID' })
    }
    if (!this.apiKey) {
      this.apiKey = await password({ message: 'MsEdge apiKey' })
    }
    return {
      clientId: this.clientId,
      apiKey: this.apiKey
    }
  }

  async start () {
    if (await confirm({ message: 'Update title, summary and description?' })) {
      console.log('hohoho, ms has not yet provided an api for updating product metadata yet')
    }
  }
}

(async function main () {
  if (await confirm({ message: 'Start AMO Updater?' })) {
    const amo = new AmoUpdater()
    amo.start()
  }

  if (await confirm({ message: 'Start MsEdge Updater?' })) {
    const ms = new MsEdgeUpdater()
    ms.start()
  }
})()
