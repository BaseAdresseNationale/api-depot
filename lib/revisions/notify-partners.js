const createNotifyPartnersOnForcePublishEmail = require("../emails/notify-partners-on-force-publish");
const { sendMail } = require("../util/sendmail");
const Client = require("../clients/model");
const Mandataire = require("../mandataires/model");
const ChefDeFile = require("../chefs-de-file/model");
const { getCommune } = require("../util/cog");

const MANAGED_CLIENTS = {
  MES_ADRESSES: "mes-adresses",
  MOISSONNEUR_BAL: "moissonneur-bal",
  FORMULAIRE_PUBLICATION: "formulaire-publication",
  GUICHET_ADRESSE: "guichet-adresse",
};

function wasPublishedByManagedClient(client) {
  return Object.values(MANAGED_CLIENTS).includes(client.id);
}

async function notifyPartnersOnForcePublish({ prevRevision, currentRevision }) {
  // Pas d'envoie si il s'agit d'une première publication
  if (!prevRevision) {
    return;
  }

  try {
    const currentClient = await Client.fetch(currentRevision.client);
    const prevClient = await Client.fetch(prevRevision.client);

    // On n'envoie pas de mail si la révision antérieure avait été publiée
    // par un de nos clients (Mes-adresses, Moissonneur, Formulaire, Guichet)
    if (
      !currentClient ||
      !prevClient ||
      wasPublishedByManagedClient(prevClient)
    ) {
      return;
    }

    // On envoie un mail si la révision courante a été publiée par mes-adresses ou formulaire
    // et que la révision antérieure avait été par un client non géré
    if (
      currentClient.id === MANAGED_CLIENTS.MES_ADRESSES ||
      currentClient.id === MANAGED_CLIENTS.FORMULAIRE_PUBLICATION
    ) {
      const chefDeFile = await ChefDeFile.fetch(prevClient.chefDeFile);
      const mandataire = await Mandataire.fetch(prevClient.mandataire);
      const contactEmail = chefDeFile?.email || mandataire?.email;
      const commune = getCommune(currentRevision.codeCommune);
      const balId = currentRevision.context?.extras?.balId;
      const email = createNotifyPartnersOnForcePublishEmail({ commune, balId });
      await sendMail(email, contactEmail ? [contactEmail] : []);
    }
  } catch (error) {
    console.error(error);
  }
}

module.exports = { notifyPartnersOnForcePublish };
