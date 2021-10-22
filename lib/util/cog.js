const {keyBy} = require('lodash')
const communes = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => ['commune-actuelle', 'arrondissement-municipal'].includes(c.type))

const communesIndex = keyBy(communes, 'code')

const codesCommunes = new Set(communes.map(c => c.code))

function isCommuneActuelle(codeCommune) {
  return codesCommunes.has(codeCommune)
}

function getCommune(codeCommune) {
  return communesIndex[codeCommune]
}

module.exports = {communes, isCommuneActuelle, getCommune}
