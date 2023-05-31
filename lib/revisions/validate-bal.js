const {intersection, union, difference} = require('lodash')
const {validate} = require('@ban-team/validateur-bal')
const {errors: baseErrors, warnings: baseWarnings, infos: baseInfos} = require('@ban-team/validateur-bal/lib/schema/profiles/1.3-etalab')
const {version: validatorVersion} = require('@ban-team/validateur-bal/package.json')

const createError = require('http-errors')

const strictModeAdditionalErrors = [
  'cle_interop.valeur_manquante',
  'cle_interop.numero_prefixe_manquant',
  'cle_interop.casse_invalide',
  'numero.contient_prefixe',
  'suffixe.espaces_debut_fin',
  'commune_insee.valeur_manquante',
  'commune_insee.espaces_debut_fin',
  'x.separateur_decimal_invalide',
  'y.separateur_decimal_invalide',
  'long.separateur_decimal_invalide',
  'lat.separateur_decimal_invalide',
  'date_der_maj.date_invalide',
  'field.commune_insee.missing',
  'file.encoding.non_standard',
  'file.delimiter.non_standard',
  'file.linebreak.non_standard'
]

// Rendre cle_interop et source optionnels

function getRowCodeCommune(row) {
  if (row.parsedValues.commune_insee) {
    return row.parsedValues.commune_insee
  }

  if (row.additionalValues.cle_interop) {
    return row.additionalValues.cle_interop.codeCommune
  }
}

function isSameCommune(rows, codeCommune) {
  return rows.every(r => getRowCodeCommune(r) === codeCommune)
}

async function applyValidateBAL(file, codeCommune, options = {}) {
  const {rowsCountValue, relaxMode} = options
  const {parseOk, parseErrors, uniqueErrors, rows} = await validate(file, {relaxFieldsDetection: relaxMode})

  if (!parseOk) {
    return {
      validation: {
        valid: false,
        validatorVersion,
        parseErrors
      }
    }
  }

  if (rows.length <= 0) {
    throw createError(400, 'Le fichier BAL analysé ne comporte aucune lignes de données.')
  }

  if (rowsCountValue && Number.parseInt(rowsCountValue, 10) !== rows.length) {
    throw createError(400, 'Le fichier BAL analysé ne comporte pas le nombre de lignes de données indiqué dans l’en-tête X-Rows-Count.')
  }

  const errors = relaxMode ? baseErrors : union(baseErrors, strictModeAdditionalErrors)
  const warnings = relaxMode ? baseWarnings : difference(baseWarnings, strictModeAdditionalErrors)
  const infos = relaxMode ? baseInfos : difference(baseInfos, strictModeAdditionalErrors)

  const foundErrors = intersection(errors, uniqueErrors)
  const foundWarnings = intersection(warnings, uniqueErrors)
  const foundInfos = intersection(infos, uniqueErrors)

  if (!isSameCommune(rows, codeCommune)) {
    foundErrors.push('commune_insee.valeur_inattendue')
  }

  const isValid = foundErrors.length === 0

  return {
    rows,
    validation: {
      valid: isValid,
      validatorVersion,
      errors: foundErrors,
      warnings: foundWarnings,
      infos: foundInfos,
      rowsCount: rows.length
    }
  }
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
        {rowsCountValue: req.get('X-Rows-Count'), relaxMode: req.query.relax === '1'}
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
