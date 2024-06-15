import inquirer from 'inquirer'
import jwt from 'jsonwebtoken'
import fs from 'node:fs'

async function genToken () {
  const questions = [{ type: 'password', name: 'key' }, { type: 'password', name: 'secret' }]
  let answers = { key: process.env.AMO_JWT_KEY, secret: process.env.AMO_JWT_SECRET }
  if (!(answers.key && answers.secret)) {
    console.log('Get your key and secret at https://addons.mozilla.org/en-US/developers/addon/api/key/')
    answers = await inquirer.prompt(questions, answers)
  }

  const issuedAt = Math.floor(Date.now() / 1000)
  const payload = {
    iss: answers.key,
    jti: Math.random().toString(),
    iat: issuedAt,
    exp: issuedAt + 60
  }

  const secret = answers.secret
  const token = jwt.sign(payload, secret, { algorithm: 'HS256' })
  return token
}

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

async function buildRequestBody () {
  const locales = (await readDirectory('./promo/_locales'))
  const body = { summary: {}, description: {} }
  for (const locale of locales) {
    const messages = await readJSONFile(`./promo/_locales/${locale}/messages.json`)
    body.summary[locale] = messages.amo_summary.message
    body.description[locale] = messages.amo_description.message
  }
  return body
}

async function request () {
  const baseUrl = 'https://addons.mozilla.org/api/v5/'
  const token = await genToken()
  const body = await buildRequestBody()
  return fetch(baseUrl + 'addons/addon/qr-lite/', {
    method: 'PATCH',
    headers: {
      Authorization: 'JWT ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
}

(async function main () {
  process.chdir(import.meta.dirname)
  const response = await request()
  console.log('response body: ', await response.json())
  if (response.ok) {
    process.exit(0)
  } else {
    process.exit(1)
  }
})()
