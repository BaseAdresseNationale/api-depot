const process = require('process')
const got = require('got')

const BAN_PLATEFORME_URL = process.env.BAN_PLATEFORME_URL || 'https://plateforme.adresse.data.gouv.fr'
const BAN_PLATEFORME_TOKEN = process.env.BAN_PLATEFORME_TOKEN

async function composeCommune(codeCommune) {
  return got(`${BAN_PLATEFORME_URL}/ban/communes/${codeCommune}/compose`, {
    headers: {
      Authorization: `Token ${BAN_PLATEFORME_TOKEN}`
    },
    responseType: 'json'
  })
}

module.exports = {composeCommune}
