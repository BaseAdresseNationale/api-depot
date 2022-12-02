const createError = require('http-errors')
const {omit} = require('lodash')
const mongo = require('./mongo')
const {isCommuneActuelle, isCommune} = require('./cog')

const ADMIN_TOKEN = process.env.ADMIN_TOKEN

function ensureCodeCommune(req, res, next) {
  if (!isCommune(req.params.codeCommune)) {
    return next(createError(404, 'Le code commune n’existe pas'))
  }

  req.codeCommune = req.params.codeCommune
  next()
}

function ensureCommuneActuelle(req, res, next) {
  if (!isCommuneActuelle(req.codeCommune)) {
    return next(createError(403, 'Le commune n’est plus active'))
  }

  next()
}

function ensureIsAdmin(req, res, next) {
  if (!ADMIN_TOKEN) {
    return next(createError(401, 'Aucun jeton d’administration n’a été défini'))
  }

  if (req.get('Authorization') !== `Token ${ADMIN_TOKEN}`) {
    return next(createError(401, 'Vous n’êtes pas autorisé à effectuer cette action'))
  }

  next()
}

async function authClient(req, res, next) {
  if (!req.get('Authorization') || !req.get('Authorization').startsWith('Token ')) {
    return next(createError(401, 'Une authentification est nécessaire'))
  }

  const token = req.get('Authorization').slice(6)
  const client = await mongo.db.collection('clients').findOne({token})

  if (!client) {
    return next(createError(401, 'Authentification refusée'))
  }

  req.client = omit(client, 'token', '_id')
  next()
}

module.exports = {ensureCodeCommune, ensureCommuneActuelle, ensureIsAdmin, authClient}
