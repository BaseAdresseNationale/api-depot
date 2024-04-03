#!/usr/bin/env node
require("dotenv").config();

const { join } = require("path");
const { readFileSync } = require("fs");
const yaml = require("js-yaml");
const { every } = require("lodash");
const mongo = require("../lib/util/mongo");

function validateData(clients) {
  const clientsCount = clients.length;
  console.log(`ℹ️ Nombre de clients trouvés : ${clientsCount}`);

  if (
    !every(
      clients,
      ({ id, nom, token, authorizationStrategy }) =>
        id && nom && token && authorizationStrategy,
    )
  ) {
    throw new Error(
      "Tous les clients ne possèdent pas les informations nécessaire",
    );
  }
}

async function main() {
  const clientsYML = yaml.load(
    readFileSync(join(__dirname, "..", "clients-demo-migration.yml"), "utf8"),
  );
  validateData(clientsYML);

  await mongo.connect();

  await populateClients(clientsYML);

  await updateRevisionsClients();
  await updateHabilitationsClients();

  await mongo.disconnect();
}

async function populateClients(clientsYML) {
  const now = new Date();

  // Création du faux mandataire de démonstration
  const mandaireDemoId = new mongo.ObjectId();
  await mongo.db.collection("mandataires").insertOne({
    _id: mandaireDemoId,
    nom: "mandataire démo",
    email: "adresse@data.gouv.fr",
    createdAt: now,
    updatedAt: now,
  });

  // Récupération des clients
  const clients = clientsYML.map((item) => ({
    _id: new mongo.ObjectId(),
    id: item.id,
    mandataire: mandaireDemoId,
    nom: item.nom,
    token: item.token,
    options: item.options || { relaxMode: false },
    active: true,
    authorizationStrategy: item.authorizationStrategy,
  }));

  await mongo.db.collection("clients").insertMany(clients);
  const countClients = await mongo.db.collection("clients").count();
  console.log(`${countClients} clients ajouté en base.`);
}

async function updateRevisionsClients() {
  const clients = await mongo.db.collection("clients").find().toArray();

  // Remplace l'ancien objet client des révisions par le nouvel id mongo
  let revisionsModifiedCount = 0;
  for (const client of clients) {
    const revisionsUpdated = await mongo.db.collection("revisions").updateMany(
      { "client.nom": client.nom },
      {
        // eslint-disable-line no-await-in-loop
        $set: { client: client._id },
      },
    );
    revisionsModifiedCount += revisionsUpdated.modifiedCount;
  }

  const revisionsTotalCount = await mongo.db.collection("revisions").count();
  console.log(
    `${revisionsModifiedCount} / ${revisionsTotalCount} revisions ont été mises à jour`,
  );

  if (revisionsModifiedCount !== revisionsTotalCount) {
    const notUpdated = await mongo.db
      .collection("revisions")
      .find({ "client.nom": { $exists: true } })
      .toArray();
    console.log(
      `Les révisions suivant n’ont pas pu être mise à jour : ${notUpdated.map((r) => r._id).join(", ")}`,
    );
  }
}

async function updateHabilitationsClients() {
  const clients = await mongo.db.collection("clients").find().toArray();

  // Remplace l'ancien objet client des habilitations par le nouvel id mongo
  let habilitationsModifiedCount = 0;
  for (const client of clients) {
    const habilitationsUpdated = await mongo.db
      .collection("habilitations")
      .updateMany(
        { "client.nom": client.nom },
        {
          // eslint-disable-line no-await-in-loop
          $set: { client: client._id },
        },
      );

    habilitationsModifiedCount += habilitationsUpdated.modifiedCount;
  }

  const habilitationsTotalCount = await mongo.db
    .collection("habilitations")
    .count();
  console.log(
    `${habilitationsModifiedCount} / ${habilitationsTotalCount} habilitations ont été mises à jour`,
  );

  if (habilitationsModifiedCount !== habilitationsTotalCount) {
    const notUpdated = await mongo.db
      .collection("habilitations")
      .find({ "client.nom": { $exists: true } })
      .toArray();
    console.log(
      `Les habilitations suivant n’ont pas pu être mise à jour : ${notUpdated.map((h) => h._id).join(", ")}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
