const createError = require("http-errors");
const Joi = require("joi");
const mongo = require("../util/mongo");
const { validPayload } = require("../util/payload");
const { isEPCI, isDepartement, isCommune } = require("../util/cog");

function validPerimetre(perimetre) {
  const { type, code } = perimetre;
  if (!["epci", "departement", "commune"].includes(type)) {
    throw new Error("Le type du terrioire est invalide");
  }

  if (type === "commune" && !isCommune(code)) {
    throw new Error("Le code commune est invalide");
  }

  if (type === "departement" && !isDepartement(code)) {
    throw new Error("Le code département est invalide");
  }

  if (type === "epci" && !isEPCI(code)) {
    throw new Error("Le siren epci est invalide");
  }

  return perimetre;
}

const createSchema = Joi.object({
  nom: Joi.string().min(3).max(200).required(),
  email: Joi.string().email().required(),
  isEmailPublic: Joi.boolean().default(true),
  perimetre: Joi.array().items(Joi.custom(validPerimetre)).min(1).required(),
  signataireCharte: Joi.boolean().default(false),
});

async function create(payload) {
  const chefDefile = validPayload(payload, createSchema);

  mongo.decorateCreation(chefDefile);

  await mongo.db.collection("chefs_de_file").insertOne(chefDefile);

  return chefDefile;
}

const updateSchema = Joi.object({
  nom: Joi.string().min(3).max(200),
  email: Joi.string().email(),
  isEmailPublic: Joi.boolean(),
  perimetre: Joi.array().items(Joi.custom(validPerimetre)).min(1),
  signataireCharte: Joi.boolean(),
});

async function update(id, payload) {
  const chefDefile = validPayload(payload, updateSchema);

  if (Object.keys(chefDefile).length === 0) {
    throw createError(
      400,
      "Le contenu de la requête est invalide (aucun champ valide trouvé)",
    );
  }

  mongo.decorateModification(chefDefile);

  const { value } = await mongo.db
    .collection("chefs_de_file")
    .findOneAndUpdate(
      { _id: mongo.parseObjectID(id) },
      { $set: chefDefile },
      { returnDocument: "after" },
    );

  if (!value) {
    throw createError(404, "Le chef de file est introuvable");
  }

  return value;
}

function fetch(chefDeFileId) {
  chefDeFileId = mongo.parseObjectID(chefDeFileId);

  if (!chefDeFileId) {
    throw createError(404, "L’identifiant du chef de file est invalide");
  }

  return mongo.db.collection("chefs_de_file").findOne({ _id: chefDeFileId });
}

async function fetchAll() {
  return mongo.db.collection("chefs_de_file").find().toArray();
}

module.exports = {
  create,
  update,
  fetch,
  fetchAll,
};
