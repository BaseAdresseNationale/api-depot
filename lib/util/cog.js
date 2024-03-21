const {keyBy, groupBy} = require('lodash')
const epcis = require('@etalab/decoupage-administratif/data/epci.json')
const departements = require('@etalab/decoupage-administratif/data/departements.json')
const communes = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => ['commune-actuelle', 'arrondissement-municipal'].includes(c.type))

const arrondissements = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => ['arrondissement-municipal'].includes(c.type))

const communesIndex = keyBy(communes, 'code')

const communeByDepartement = groupBy(communes, 'departement')

const codesCommunesActuelles = new Set(communes.map(c => c.code))

const epciByCode = keyBy(epcis, 'code')

const codesCommunes = new Set()
for (const commune of communes) {
  codesCommunes.add(commune.code)
  const anciensCodes = commune.anciensCodes || []
  for (const ancienCode of anciensCodes) {
    codesCommunes.add(ancienCode)
  }
}

const codesEPCI = new Set(epcis.map(e => e.code))
const codesDepartement = new Set(departements.map(d => d.code))

function isCommune(codeCommune) {
  return codesCommunes.has(codeCommune)
}

function isCommuneActuelle(codeCommune) {
  return codesCommunesActuelles.has(codeCommune)
}

function getCommune(codeCommune) {
  return communesIndex[codeCommune]
}

function getCommuneByDepartement(codeDepartement) {
  return communeByDepartement[codeDepartement]
}

function isEPCI(siren) {
  return codesEPCI.has(siren)
}

function getEPCI(siren) {
  return epciByCode[siren]
}

function isDepartement(codeDepartement) {
  return codesDepartement.has(codeDepartement)
}

function isArrondissement(codeArrondissement) {
  return arrondissements.some(({code}) => code === codeArrondissement)
}

function getCommuneByArrondissement(codeArrondissement) {
  return arrondissements.find(({code}) => code === codeArrondissement)
}

module.exports = {
  isEPCI,
  getEPCI,
  isDepartement,
  communes,
  isCommune,
  isCommuneActuelle,
  getCommune,
  getCommuneByDepartement,
  isArrondissement,
  getCommuneByArrondissement
}
