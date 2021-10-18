const createError = require('http-errors')
const {isCommuneActuelle} = require('./cog')

function ensureCodeCommune(req, res, next) {
  if (!isCommuneActuelle(req.params.codeCommune)) {
    return next(createError(404, 'Le code commune n’existe pas ou n’est plus en vigueur'))
  }

  req.codeCommune = req.params.codeCommune
  next()
}

module.exports = {ensureCodeCommune}
