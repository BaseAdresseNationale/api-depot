const got = require("got");
const { deburr } = require("lodash");
const createError = require("http-errors");
const mongo = require("../util/mongo");
const Client = require("../clients/model");

const API_ANNUAIRE =
  process.env.API_ANNUAIRE ||
  "https://api-lannuaire.service-public.fr/api/explore/v2.1";

async function getCommuneEmail(codeCommune) {
  try {
    const url = `${API_ANNUAIRE}/catalog/datasets/api-lannuaire-administration/records?where=pivot%20LIKE%20"mairie"%20AND%20code_insee_commune=${codeCommune}`;
    const response = await got(url, { responseType: "json" });

    // RECUPERE LA MAIRIE PRINCIPAL
    const mairie = response.body.results.find(
      ({ nom }) => !normalize(nom).includes("deleguee"),
    );

    const email = mairie.adresse_courriel;
    if (!email || email === "") {
      throw new Error("L’adresse email n’est pas trouvé");
    }

    if (validateEmail(email)) {
      return email;
    }

    throw new Error(`L’adresse email " ${email} " ne peut pas être utilisée`);
  } catch (error) {
    console.log(
      `Une erreur s’est produite lors de la récupération de l’adresse email de la mairie (Code commune: ${codeCommune}).`,
      error,
    );
  }
}

function normalize(str) {
  return deburr(str).toLowerCase();
}

function validateEmail(email) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[(?:\d{1,3}\.){3}\d{1,3}])|(([a-zA-Z\-\d]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

async function createHabilitation({ codeCommune, client }) {
  const now = new Date();
  const _id = new mongo.ObjectId();

  const emailCommune = await getCommuneEmail(codeCommune);

  const habilitation = {
    _id,

    codeCommune,
    emailCommune,

    franceconnectAuthenticationUrl: `${process.env.API_DEPOT_URL}/habilitations/${_id}/authentication/franceconnect`,

    strategy: null,

    client: client._id,
    status: "pending",

    createdAt: now,
    updatedAt: now,
    expiresAt: null,
  };

  await mongo.db.collection("habilitations").insertOne(habilitation);

  return habilitation;
}

async function askHabilitation(habilitation, strategy) {
  const changes = {
    updatedAt: new Date(),
    strategy,
  };

  await mongo.db
    .collection("habilitations")
    .updateOne({ _id: habilitation._id }, { $set: changes });

  return { ...habilitation, ...changes };
}

async function acceptHabilitation(habilitationId, changes) {
  const now = new Date();
  const habilitationEnd = new Date();
  habilitationEnd.setMonth(habilitationEnd.getMonth() + 12);

  await mongo.db.collection("habilitations").updateOne(
    { _id: habilitationId },
    {
      $set: {
        ...changes,
        status: "accepted",
        updatedAt: now,
        acceptedAt: now,
        expiresAt: habilitationEnd,
      },
    },
  );
}

async function rejectHabilitation(habilitationId, changes) {
  const now = new Date();

  await mongo.db.collection("habilitations").updateOne(
    { _id: habilitationId },
    {
      $set: {
        ...changes,
        status: "rejected",
        updatedAt: now,
        rejectedAt: now,
      },
    },
  );
}

function fetchHabilitation(habilitationId) {
  try {
    habilitationId = new mongo.ObjectId(habilitationId);
  } catch {
    throw createError(404, "L’identifiant de l’habilitation est invalide");
  }

  return mongo.db.collection("habilitations").findOne({ _id: habilitationId });
}

async function expandWithClient(habilitation) {
  const publicClient = await Client.computePublicClient(habilitation.client);
  return { ...habilitation, client: publicClient };
}

module.exports = {
  createHabilitation,
  askHabilitation,
  acceptHabilitation,
  rejectHabilitation,
  fetchHabilitation,
  expandWithClient,
};
