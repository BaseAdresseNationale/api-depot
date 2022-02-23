const {keyBy} = require('lodash')
const communes = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => ['commune-actuelle', 'arrondissement-municipal'].includes(c.type))

const communesIndex = keyBy(communes, 'code')

const codesCommunesActuelles = new Set(communes.map(c => c.code))

const codesCommunes = new Set()
for (const commune of communes) {
  codesCommunes.add(commune.code)
  const anciensCodes = commune.anciensCodes || []
  for (const ancienCode of anciensCodes) {
    codesCommunes.add(ancienCode)
  }
}

function isCommune(codeCommune) {
  return codesCommunes.has(codeCommune)
}

function isCommuneActuelle(codeCommune) {
  return codesCommunesActuelles.has(codeCommune)
}

function getCommune(codeCommune) {
  return communesIndex[codeCommune]
}

module.exports = {communes, isCommune, isCommuneActuelle, getCommune}
