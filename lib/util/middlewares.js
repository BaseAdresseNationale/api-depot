const createError = require('http-errors')
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

module.exports = {ensureCodeCommune, ensureCommuneActuelle, ensureIsAdmin}
