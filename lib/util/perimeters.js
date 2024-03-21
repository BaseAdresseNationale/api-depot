const {getCommuneByDepartement, getEPCI, isArrondissement, getCommuneByArrondissement} = require('./cog.js')

function isInDepartement(departement, codeCommune) {
  const communeByDepartement = getCommuneByDepartement(departement)
  return communeByDepartement && communeByDepartement.some(({code}) => code === codeCommune)
}

function isInEPCI(siren, codeCommune) {
  const epci = getEPCI(siren)
  return epci.membres && epci.membres.some(({code}) => code === codeCommune)
}

function communeIsInPerimeters(codeInsee, perimeters) {
  const codeCommune = isArrondissement(codeInsee) ? getCommuneByArrondissement(codeInsee) : codeInsee

  return perimeters.some(({type, code}) => {
    if (type === 'commune' && code === codeCommune) {
      return true
    }

    if (type === 'departement' && isInDepartement(code, codeCommune)) {
      return true
    }

    if (type === 'epci' && isInEPCI(code, codeCommune)) {
      return true
    }

    return false
  })
}

module.exports = {communeIsInPerimeters}
