const {keyBy} = require('lodash')
const epcis = require('@etalab/decoupage-administratif/data/epci.json')
const departements = require('@etalab/decoupage-administratif/data/departements.json')
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

const codesEPCI = new Set()
for (const epci of epcis) {
  codesEPCI.add(epci.code)
}

const codesDepartement = new Set()
for (const departement of departements) {
  codesDepartement.add(departement.code)
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

function isEPCI(siren) {
  return codesEPCI.has(siren)
}

function isDepartement(codeDepartement) {
  return codesDepartement.has(codeDepartement)
}

module.exports = {
  isEPCI,
  isDepartement,
  communes,
  isCommune,
  isCommuneActuelle,
  getCommune
}
