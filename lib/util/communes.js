const got = require('got')
const {deburr} = require('lodash')

function normalize(str) {
  return deburr(str).toLowerCase()
}

const API_ETABLISSEMENTS_PUBLICS = process.env.API_ETABLISSEMENTS_PUBLICS || 'https://etablissements-publics.api.gouv.fr/v3'

function validateEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[(?:\d{1,3}\.){3}\d{1,3}])|(([a-zA-Z\-\d]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}

const getCommuneEmail = async function (codeCommune) {
  try {
    const response = await got(`${API_ETABLISSEMENTS_PUBLICS}/communes/${codeCommune}/mairie`, {responseType: 'json'})
    const mairie = response.body.features
      .find(m => !normalize(m.properties.nom).includes('deleguee'))

    const {email} = mairie.properties
    if (validateEmail(email)) {
      return email
    }

    throw new Error(`L’adresse email " ${email} " ne peut pas être utilisée`)
  } catch (error) {
    console.log(`Une erreur s’est produite lors de la récupération de l’adresse email de la mairie (Code commune: ${codeCommune}).`, error)
  }
}

module.exports = {getCommuneEmail}
