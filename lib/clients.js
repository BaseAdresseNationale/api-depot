
const {keyBy, omit} = require('lodash')
const createError = require('http-errors')

function authenticateClient(clients) {
  const byToken = keyBy(clients, 'token')

  return (req, res, next) => {
    if (!req.get('Authorization') || !req.get('Authorization').startsWith('Token ')) {
      return next(createError(401, 'Une authentification est nécessaire'))
    }

    const token = req.get('Authorization').slice(6)
    const client = byToken[token]

    if (!client) {
      return next(createError(401, 'Authentification refusée'))
    }

    if (req.revision && req.revision.client.name !== client.name) {
      return next(createError(403, 'Vous n’êtes pas autorisé à modifier cette révision'))
    }

    req.client = omit(client, 'token')
    next()
  }
}

module.exports = {authenticateClient}
