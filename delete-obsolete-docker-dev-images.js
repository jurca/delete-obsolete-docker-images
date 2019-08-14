#!/usr/bin/node

const {request} = require('https')
const {promisify} = require('util')

const API_ENDPOINT = 'https://doc.ker.dev.dszn.cz/v2'

if (process.argv.length !== 3) {
  console.error(`Usage: ${process.argv0} '${process.argv[1]}' docker_image_name`)
  process.exit(1)
}
const [,,imageName] = process.argv

;(async () => {
  console.log(`Reading tags for the image ${imageName}...`)
  const tagsListResponse = await sendRequest(`/${encodeURIComponent(imageName)}/tags/list`)
  const {tags} = tagsListResponse
  console.log(`Found ${tags.length} tags. Reading image digests...`)
  const digests = await Promise.all(tags.map(
    tag => sendRequest(`/${encodeURIComponent(imageName)}/manifests/${encodeURIComponent(tag)}`).then(
      responseBody => (responseBody.config || {}).digest || ''
    ),
  ))
  console.log(`Digests loaded successfuly. Deleting all images with name ${imageName}...`)
  const result = await allSettled(digests.map(digest => sendRequest(
    `/${encodeURIComponent(imageName)}/manifests/${encodeURIComponent(digest)}`,
    {method: 'DELETE'},
    ).then(result => ({digest, result})),
  ))
  console.log(result)
  console.log('Done')
})().catch(error => {
  console.error(error)
  process.exit(2)
})

function sendRequest(url, options = {}) {
  const composedOptions = {
    rejectUnauthorized: false,
    ...options,
    headers: {
      'Accept': 'application/vnd.docker.distribution.manifest.v2+json',
      ...options.headers,
    },
  }
  return new Promise((resolve, reject) => {
    const currentRequest = request(`${API_ENDPOINT}${url}`, composedOptions, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`The server responded with the status code ${response.statusCode}`))
      }

      const chunks = []
      response.setEncoding('utf8')
      response.on('data', chunk => {
        chunks.push(chunk)
      })
      response.on('end', () => {
        const responseBody = chunks.join('')
        try {
          if (response.statusCode === 200) {
            resolve(JSON.parse(responseBody))
          } else {
            resolve(response.statusCode)
          }
        } catch (decodeError) {
          decodeError.message = `${decodeError.message}\nInput: ${responseBody}`
          reject(decodeError)
        }
      })
    })
    currentRequest.on('error', error => {
      reject(error)
    })
    currentRequest.end()
  })
}

function allSettled(promises) {
  return Promise.all(promises.map(
    promise => promise.then(value => ({status: 'fulfilled', value})).catch(reason => ({status: 'rejected', reason})),
  ))
}
