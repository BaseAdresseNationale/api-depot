const {promisify} = require('util')
const zlib = require('zlib')
const bytes = require('bytes')
const getStream = require('get-stream')
const hasha = require('hasha')
const createError = require('http-errors')
const contentDisposition = require('content-disposition')

const gunzip = promisify(zlib.gunzip)

function rawBodyParser(maxBuffer = '1mb') {
  maxBuffer = typeof maxBuffer === 'string' ? bytes(maxBuffer) : maxBuffer

  return async (req, res, next) => {
    try {
      let bodyBuffer = await getStream.buffer(req, {maxBuffer})

      if (req.get('Content-MD5')) {
        const signature = hasha(bodyBuffer, {algorithm: 'md5'})

        if (signature !== req.get('Content-MD5')) {
          return next(createError(400, 'La valeur de l’en-tête Content-MD5 ne correspond pas à la signature MD5 du contenu soumis.'))
        }
      }

      if (req.get('Content-Encoding') && req.get('Content-Encoding') !== 'gzip') {
        return next(createError(400, 'Type de compression du contenu non supporté.'))
      }

      if (req.get('Content-Encoding') === 'gzip') {
        bodyBuffer = await gunzip(bodyBuffer)
      }

      if (req.get('Content-Disposition') && req.get('Content-Disposition').includes('filename')) {
        req.filename = contentDisposition.parse(req.get('Content-Disposition')).parameters.filename
      }

      req.body = bodyBuffer
      next()
    } catch (error) {
      next(error)
    }
  }
}

module.exports = rawBodyParser
