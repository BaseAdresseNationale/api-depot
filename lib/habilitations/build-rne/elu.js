const {invert, deburr} = require('lodash')
const {normalizeDate} = require('./util')

const headersMapping = invert({
  sexe: 'Code sexe',
  nomComplet: 'Nom de l\'élu',
  prenom: 'Prénom de l\'élu',
  dateNaissance: 'Date de naissance'
})

const SEPARATEURS_NOMS = [
  'EPOUX',
  'ÉPOUX',
  'EPOUSE',
  'ÉPOUSE',
  'VEUF',
  'VEUVE'
]

function splitWith(words, separateur) {
  const index = words.indexOf(separateur)
  if (index <= 0 || index === (words.length - 1)) {
    return null
  }

  return {
    nomNaissance: words.slice(0, index).join(' '),
    nomMarital: words.slice(index + 1).join(' ')
  }
}

function splitNom(nomComplet) {
  const words = nomComplet.toUpperCase().split(' ')
  if (words.length >= 3) {
    const splitResults = SEPARATEURS_NOMS.map(separateur => splitWith(words, separateur)).filter(Boolean)
    if (splitResults.length > 0) {
      return splitResults[0]
    }
  }

  return {nomNaissance: words.join(' ')}
}

function normalizeStr(str) {
  return deburr(str).toUpperCase().replace(/[^A-Z]/g, ' ').replace(/\s+/g, '-')
}

function computeId({nomNaissance, prenom, dateNaissance, sexe}) {
  return `${dateNaissance}@${sexe}@${normalizeStr(nomNaissance)}@${normalizeStr(prenom)}`
}

function prepare({sexe, dateNaissance, nomComplet, prenom}) {
  if (!sexe || !dateNaissance || !nomComplet || !prenom) {
    return null
  }

  const normalizedDateNaissance = normalizeDate(dateNaissance)
  const {nomNaissance, nomMarital} = splitNom(nomComplet)

  return {
    id: computeId({nomNaissance, prenom, dateNaissance: normalizedDateNaissance, sexe}),
    sexe,
    nomNaissance,
    nomMarital,
    prenom,
    dateNaissance: normalizedDateNaissance
  }
}

module.exports = {headersMapping, prepare, computeId}
