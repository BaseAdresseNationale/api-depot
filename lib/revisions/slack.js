const {WebClient} = require('@slack/web-api')
const {getCommune} = require('../util/cog')

async function notifyPublication({codeCommune, publicationType, client}) {
  if (!process.env.SLACK_TOKEN || !process.env.SLACK_CHANNEL) {
    return
  }

  const web = new WebClient(process.env.SLACK_TOKEN)

  const commune = getCommune(codeCommune)
  const operationFr = publicationType === 'creation' ? 'Publication' : 'Mise à jour'

  const text = `${operationFr} d’une Base Adresse Locale - *${commune.nom}* (${commune.code})
_Application : ${client.nom} - API de dépôt :electric_plug:_`

  return web.chat.postMessage({channel: process.env.SLACK_CHANNEL, text})
}

module.exports = {notifyPublication}
