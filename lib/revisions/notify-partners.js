const createNotifyPartnersOnForcePublishEmail = require('../emails/notify-partners-on-force-publish')
const {sendMail} = require('../util/sendmail')

const MES_ADRESSES_CLIENT_ID = 'mes-adresses'

async function notifyPartnersOnForcePublish({oldCurrentRevision, currentRevision}) {
  console.log('oldCurrentRevision', oldCurrentRevision)
  console.log('currentRevision', currentRevision)
  if (!oldCurrentRevision) {
    return
  }

  try {
    if (currentRevision.client.id === MES_ADRESSES_CLIENT_ID && oldCurrentRevision.client.id !== MES_ADRESSES_CLIENT_ID) {
      const mandataire = oldCurrentRevision.mandataire
      const partnerEmail = mandataire.email

      // On n'envoie pas de mail si la révision avait été publiée par un de nos clients API-Depot (Moissonneur, Formulaire, Guichet, etc.)
      if (!partnerEmail || partnerEmail === process.env.SMTP_FROM) {
        return
      }

      const email = createNotifyPartnersOnForcePublishEmail({oldCurrentRevision, currentRevision})
      await sendMail(email, [partnerEmail])
    }
  } catch (error) {
    console.error(error)
  }
}

module.exports = {notifyPartnersOnForcePublish}
