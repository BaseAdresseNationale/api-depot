const createError = require('http-errors')
const {isCommuneActuelle, isCommune} = require('./cog')

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

module.exports = {ensureCodeCommune, ensureCommuneActuelle}
