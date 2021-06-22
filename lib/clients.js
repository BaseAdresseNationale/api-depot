const {join} = require('path')
const {readFileSync} = require('fs')
const {keyBy, omit} = require('lodash')
const createError = require('http-errors')
const yaml = require('js-yaml')

const clients = yaml.load(readFileSync(join(__dirname, '..', 'clients.yml'), 'utf8'))
const byToken = keyBy(clients, 'token')

function authClient() {
  return (req, res, next) => {
    if (!req.get('Authorization') || !req.get('Authorization').startsWith('Token ')) {
      return next(createError(401, 'Une authentification est nécessaire'))
    }

    const token = req.get('Authorization').slice(6)
    const client = byToken[token]

    if (!client) {
      return next(createError(401, 'Authentification refusée'))
    }

    req.client = omit(client, 'token')
    next()
  }
}

module.exports = {authClient}
