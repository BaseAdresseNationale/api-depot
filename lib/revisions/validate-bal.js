const createError = require('http-errors')
const {validate} = require('@ban-team/validateur-bal')
const {version: validatorVersion} = require('@ban-team/validateur-bal/package.json')
const ChefDeFile = require('../chefs-de-file/model')
const {communeIsInPerimeters} = require('../util/perimeters')

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

async function checkIsInPerimetre(codeCommune, client) {
  if (client && client.chefDeFile) {
    const chefDeFile = await ChefDeFile.fetch(client.chefDeFile)
    if (!chefDeFile) {
      throw createError(400, 'Chef de file introuvable')
    }

    return chefDeFile.perimetre && communeIsInPerimeters(codeCommune, chefDeFile.perimetre)
  }

  return true
}

async function applyValidateBAL(file, codeCommune, client, options = {}) {
  const {rowsCountValue, relaxMode} = options
  const {parseOk, parseErrors, profilErrors, rows} = await validate(file, {profile: relaxMode ? '1.3-relax' : '1.3'})

  if (!parseOk) {
    return {
      validation: {
        valid: false,
        validatorVersion,
        parseErrors
      }
    }
  }

  if (rowsCountValue && Number.parseInt(rowsCountValue, 10) !== rows.length) {
    throw createError(400, 'Le fichier BAL analysé ne comporte pas le nombre de lignes de données indiqué dans l’en-tête X-Rows-Count.')
  }

  const foundErrors = profilErrors.filter(({level}) => level === 'E').map((({code}) => code))
  const foundWarnings = profilErrors.filter(({level}) => level === 'W').map((({code}) => code))
  const foundInfos = profilErrors.filter(({level}) => level === 'I').map((({code}) => code))

  if (!isSameCommune(rows, codeCommune)) {
    foundErrors.push('commune_insee.valeur_inattendue')
  }

  if (!(await checkIsInPerimetre(codeCommune, client))) {
    foundErrors.push('commune_insee.out_of_perimeter')
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

module.exports = {applyValidateBAL}
