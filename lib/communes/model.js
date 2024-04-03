const { sub } = require("date-fns");
const createError = require("http-errors");
const mongo = require("../util/mongo");

async function lockPublishing(code) {
  // On ajoute un flag afin d'éviter les publications concurrentes pour cette commune
  const commune = await mongo.db
    .collection("communes")
    .updateOne({ code }, { $set: { publishing: true } }, { upsert: true });

  const now = new Date();

  // Si aucune commune n'a été modifiée ou créée, alors une publication est déjà en cours
  if (commune.modifiedCount === 0 && commune.upsertedCount === 0) {
    throw createError(409, "Une publication est déjà en cours");
  }

  // On ajoute un chronomètre lié à 'publishing' pour détecter les publications expirées
  await mongo.db
    .collection("communes")
    .updateOne({ code }, { $set: { publishingSince: now } });
}

async function unlockPublishing(code) {
  const commune = await mongo.db.collection("communes").findOne({ code });

  if (!commune) {
    throw new Error("Commune introuvable");
  }

  // Suppression du verrou et du chronomètre d’une commune
  await mongo.db
    .collection("communes")
    .updateOne(
      { code },
      { $set: { publishing: false }, $unset: { publishingSince: 1 } },
    );
}

// Cette fonction déverrouille les communes dont le verrou est actif depuis trop longtemps et nettoie les données associées.
async function unlockAndCleanOverdueCommunes() {
  const timeLimit = sub(new Date(), { minutes: 2 });

  // Trouver les communes verrouillées dont le verrou est actif depuis plus de la limite de temps spécifiée.
  const lockedCommunes = await mongo.db
    .collection("communes")
    .distinct("code", {
      publishing: true,
      publishingSince: { $lt: timeLimit },
    });

  if (lockedCommunes.length > 0) {
    // Créer un tableau de promesses pour déverrouiller les communes en parallèle.
    const unlockPromises = lockedCommunes.map(async (code) => {
      console.error(
        `Le verrou est resté trop longtemps actif pour la commune ${code}`,
      );
      return unlockPublishing(code);
    });

    // Attendre que toutes les communes soient déverrouillées.
    await Promise.all(unlockPromises);
  }
}

module.exports = {
  lockPublishing,
  unlockPublishing,
  unlockAndCleanOverdueCommunes,
};
