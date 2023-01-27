#!/usr/bin/env node
const {join} = require('path')
const {readFileSync} = require('fs')
const yaml = require('js-yaml')
const {every, sumBy} = require('lodash')

const mongo = require('../lib/util/mongo')

function prepareData(clients) {
  const clientsCount = clients.length
  console.log(`ℹ️ Nombre de clients trouvés : ${clientsCount}`)

  if (!every(clients, ({id, nom, token, authorizationStrategy}) => id && nom && token && authorizationStrategy)) {
    throw new Error('Tous les clients ne possèdent pas les informations nécessaire')
  }
}

async function main() {
  const clientsYML = yaml.load(readFileSync(join(__dirname, '..', 'clients.yml'), 'utf8'))
  prepareData(clientsYML)

  await mongo.connect()

  await populateClients(clientsYML)

  await updateRevisionsClients()
  await updateHabilitationsClients()

  await mongo.disconnect()
}

async function populateClients(clientsYML) {
  const now = new Date()

  // Création du faux mandataire de démonstration
  const mandaireDemoId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({
    _id: mandaireDemoId,
    nom: 'mandataire démo',
    email: 'adresse@data.gouv.fr',
    createdAt: now,
    updatedAt: now
  })

  // Récupération des clients
  const clients = await Promise.all(clientsYML.map(async item => {
    const client = {
      _id: new mongo.ObjectId(),
      id: item.id,
      mandataire: mandaireDemoId,
      nom: item.nom,
      token: item.token,
      options: item.options || {relaxMode: false},
      active: true,
      authorizationStrategy: item.authorizationStrategy
    }

    return client
  }))

  await mongo.db.collection('clients').insertMany(clients)
  const countClients = await mongo.db.collection('clients').count()
  console.log(`${countClients} clients ajouté en base.`)
}

async function updateRevisionsClients() {
  const clients = await mongo.db.collection('clients').find().toArray()

  // Remplace l'ancien objet client des révisions par le nouvel id mongo
  const revisionsUpdated = await Promise.all(clients.map(
    async client => mongo.db.collection('revisions').updateMany({'client.nom': client.nom}, {
      $set: {client: client._id}
    })))

  const revisionsModifiedCount = sumBy(revisionsUpdated, item => item.modifiedCount)
  const revisionsTotalCount = await mongo.db.collection('revisions').count()
  console.log(`${revisionsModifiedCount} / ${revisionsTotalCount} revisions ont étaient mise à jour`)
}

async function updateHabilitationsClients() {
  const clients = await mongo.db.collection('clients').find().toArray()

  // Remplace l'ancien objet client des habilitations par le nouvel id mongo
  const habilitationsUpdated = await Promise.all(clients.map(
    async client => mongo.db.collection('habilitations').updateMany({'client.nom': client.nom}, {
      $set: {client: client._id}
    })))

  const habilitationsModifiedCount = sumBy(habilitationsUpdated, item => item.modifiedCount)
  const habilitationsTotalCount = await mongo.db.collection('habilitations').count()
  console.log(`${habilitationsModifiedCount} / ${habilitationsTotalCount} habilitations ont étaient mise à jour`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
