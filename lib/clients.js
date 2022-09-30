
const {omit} = require('lodash')
const createError = require('http-errors')
const mongo = require('./util/mongo')

function createAuthClient() {
  return async (req, res, next) => {
    if (!req.get('Authorization') || !req.get('Authorization').startsWith('Token ')) {
      return next(createError(401, 'Une authentification est nécessaire'))
    }

    const token = req.get('Authorization').slice(6)
    const client = await mongo.db.collection('clients').findOne({token})

    if (!client) {
      return next(createError(401, 'Authentification refusée'))
    }

    if (req.revision && req.revision.client.name !== client.name) {
      return next(createError(403, 'Vous n’êtes pas autorisé à modifier cette révision'))
    }

    req.client = omit(client, 'token', '_id')
    next()
  }
}

module.exports = {createAuthClient}
