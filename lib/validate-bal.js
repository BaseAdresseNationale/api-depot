const {intersection} = require('lodash')
const {validate} = require('@etalab/bal')
const createError = require('http-errors')

const errorCodes = [
  'cle_interop.valeur_manquante',
  'cle_interop.structure_invalide',
  'cle_interop.commune_invalide',
  'cle_interop.numero_invalide',
  'cle_interop.numero_prefixe_manquant',
  'cle_interop.casse_invalide',
  'numero.contient_prefixe',
  'numero.type_invalide',
  'suffixe.espaces_debut_fin',
  'suffixe.debut_invalide',
  'commune_insee.commune_invalide',
  'commune_insee.espaces_debut_fin',
  'position.valeur_invalide',
  'x.valeur_invalide',
  'x.separateur_decimal_invalide',
  'y.valeur_invalide',
  'y.separateur_decimal_invalide',
  'long.valeur_invalide',
  'long.separateur_decimal_invalide',
  'lat.valeur_invalide',
  'lat.separateur_decimal_invalide',
  'date_der_maj.valeur_manquante',
  'date_der_maj.date_invalide',
  'row.incoherence_numero',
  'row.position_manquante',

  // Champs obligatoires
  'field.commune_insee.missing',
  'commune_insee.valeur_manquante',

  'field.numero.missing',
  'numero.valeur_manquante',

  'field.voie_nom.missing',
  'voie_nom.valeur_manquante'
]

// Rendre cle_interop et source optionnels

function isSameCommune(rows, codeCommune) {
  return rows.every(r => r.parsedValues.commune_insee === codeCommune)
}

async function applyValidateBAL(file, codeCommune, {rowsCountValue}) {
  const {uniqueErrors, fileValidation, rows} = await validate(file, {strict: true})

  if (rowsCountValue && Number.parseInt(rowsCountValue, 10) !== rows.length) {
    throw createError(400, 'Le fichier BAL analysé ne comporte pas le nombre de lignes de données indiqué dans l’en-tête X-Rows-Count.')
  }

  const errors = intersection(errorCodes, uniqueErrors)

  const fileIsValid = fileValidation.encoding.isValid &&
  fileValidation.linebreak.isValid &&
  fileValidation.delimiter.isValid

  if (!isSameCommune(rows, codeCommune)) {
    errors.push('commune_insee.valeur_inattendue')
  }

  const isValid = errors.length === 0 && fileIsValid

  return {rows, validation: {valid: isValid, errors}}
}

function validateBAL() {
  return async (req, res, next) => {
    try {
      if (!req.body) {
        throw createError(400, 'Un fichier BAL au format CSV doit être fourni avec la requête.')
      }

      const {rows, validation} = await applyValidateBAL(
        req.body,
        req.params.codeCommune,
        {rowsCountValue: req.get('X-Rows-Count')}
      )

      req.rows = rows
      req.validateResult = validation
      next()
    } catch (error) {
      next(error)
    }
  }
}

module.exports = {validateBAL, isSameCommune, applyValidateBAL}
