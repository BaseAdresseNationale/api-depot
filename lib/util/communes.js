const got = require('got')
const {deburr} = require('lodash')

function normalize(str) {
  return deburr(str).toLowerCase()
}

const API_ETABLISSEMENTS_PUBLICS = process.env.API_ETABLISSEMENTS_PUBLICS || 'https://etablissements-publics.api.gouv.fr/v3'

const getCommuneEmail = async function (codeCommune) {
  try {
    const response = await got(`${API_ETABLISSEMENTS_PUBLICS}/communes/${codeCommune}/mairie`, {responseType: 'json'})
    const mairie = response.body.features
      .find(m => !normalize(m.properties.nom).includes('deleguee'))
    return mairie.properties.email
  } catch (error) {
    console.log(`Une erreur s’est produite lors de la récupération de l’adresse email de la mairie (Code commune: ${codeCommune}).`, error)
  }
}

module.exports = {getCommuneEmail}
