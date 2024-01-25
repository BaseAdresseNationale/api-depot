const createNotifyPartnersOnForcePublishEmail = require('../emails/notify-partners-on-force-publish')
const {sendMail} = require('../util/sendmail')

const DEMO_MODE = process.env.DEMO_MODE === '1'

const MANAGED_CLIENTS = {
  MES_ADRESSES: 'mes-adresses',
  MOISSONNEUR_BAL: 'moissonneur-bal',
  FORMULAIRE_PUBLICATION: 'formulaire-publication',
  GUICHET_ADRESSE: 'guichet-adresse'
}

function isPublishedByManagedClient(revision) {
  return Object.values(MANAGED_CLIENTS).includes(revision.client.id)
}

async function notifyPartnersOnForcePublish({oldCurrentRevision, currentRevision}) {
  // Pas d'envoie si il s'agit d'une première publication
  // ou qu'on est sur l'environnement de démo
  if (!oldCurrentRevision || DEMO_MODE) {
    return
  }

  // On n'envoie pas de mail si la révision antérieure avait été publiée
  // par un de nos clients (Mes-adresses, Moissonneur, Formulaire, Guichet)
  if (isPublishedByManagedClient(oldCurrentRevision.client.id)) {
    return
  }

  try {
    // On envoie un mail si la révision courante a été publiée par mes-adresses ou formulaire
    // et que la révision antérieure avait été par un client non géré
    if (currentRevision.client.id === MANAGED_CLIENTS.MES_ADRESSES || currentRevision.client.id === MANAGED_CLIENTS.FORMULAIRE_PUBLICATION) {
      const contactEmail = oldCurrentRevision.chefDeFile?.email || oldCurrentRevision.mandataire?.email
      const email = createNotifyPartnersOnForcePublishEmail({oldCurrentRevision, currentRevision})
      await sendMail(email, contactEmail ? [contactEmail] : [])
    }
  } catch (error) {
    console.error(error)
  }
}

module.exports = {notifyPartnersOnForcePublish}
