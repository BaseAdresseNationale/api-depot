const {WebClient} = require('@slack/web-api')
const {getCommune} = require('../util/cog')

async function notifyPublication({codeCommune, publicationType, habilitationStrategy, client}) {
  if (!process.env.SLACK_TOKEN || !process.env.SLACK_CHANNEL) {
    return
  }

  if (publicationType !== 'creation') {
    return
  }

  const web = new WebClient(process.env.SLACK_TOKEN)

  const commune = getCommune(codeCommune)
  const operationFr = publicationType === 'creation' ? 'Initialisation' : 'Mise à jour'

  let habilitationText = ''

  if (habilitationStrategy === 'franceconnect') {
    habilitationText = 'Habilitation via FranceConnect :fr:'
  }

  if (habilitationStrategy === 'email') {
    habilitationText = 'Habilitation par email :email:'
  }

  const meta = [
    `Application : ${client.nom}`,
    habilitationText
  ].filter(Boolean)

  const text = `${operationFr} d’une Base Adresse Locale - *${commune.nom}* (${commune.code})
_${meta.join(' - ')}_`

  return web.chat.postMessage({channel: process.env.SLACK_CHANNEL, text})
}

module.exports = {notifyPublication}
