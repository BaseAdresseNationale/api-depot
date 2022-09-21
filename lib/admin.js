const {join} = require('path')
const {readFileSync} = require('fs')
const yaml = require('js-yaml')
const {keyBy, omit} = require('lodash')
const createError = require('http-errors')

function getProductionAdmins() {
  return yaml.load(readFileSync(join(__dirname, '..', 'admins.yml'), 'utf-8'))
}

function createAuthAdmin(options) {
  const admins = options.admins || getProductionAdmins()
  const byToken = keyBy(admins, 'token')

  return (req, res, next) => {
    if (!req.get('Authorization') || !req.get('Authorization').startsWith('Token ')) {
      return next(createError(401, 'Une authentification est nécessaire'))
    }

    const token = req.get('Authorization').slice(6)
    const admin = byToken[token]

    if (!admin) {
      return next(createError(401, 'Authentification refusée'))
    }

    req.admin = omit(admin, 'token')
    next()
  }
}

module.exports = {createAuthAdmin}
