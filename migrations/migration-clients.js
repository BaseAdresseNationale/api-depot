#!/usr/bin/env node
const {join} = require('path')
const {readFileSync} = require('fs')
const yaml = require('js-yaml')
const {unionWith, isEqual, every} = require('lodash')

const mongo = require('../lib/util/mongo')
const {ObjectId} = require('../lib/util/mongo')

function integrityCheck(clients) {
  const clientsCount = clients.length
  console.log(`ℹ️ Nombre de clients trouvés : ${clientsCount}`)

  if (!every(clients, ({id, nom, mandataire, token, authorizationStrategy}) => id && nom && token && mandataire && authorizationStrategy)) {
    throw new Error('Tous les clients ne possèdent pas les informations nécessaire')
  }

  // Récupération et fusion des mandataires
  const mandataires = clients.map(client => {
    if (!client.mandataire) {
      throw new Error(`Le client ${client.nom} n’a pas de mandataire`)
    }

    if (!client.mandataireEmail) {
      console.error(`⚠️ Le mandataire ${client.mandataire} n’a pas d’email`)
    }

    return {
      nom: client.mandataire,
      email: client.mandataireEmail
    }
  })
  const mandatairesCount = mandataires.length
  console.log(`ℹ️ Nombre de mandaires trouvés : ${mandatairesCount}`)

  if (mandataires.length !== clientsCount) {
    throw new Error('Le nombre de mandaires ne correspond pas au nombre de clients')
  }

  const chefsDeFile = clients.filter(client => client.chefDeFile).map(({chefDeFile, chefDeFileEmail, perimetre, signataireCharte}) => {
    if (!chefDeFileEmail) {
      console.error(`⚠️ Le chef de file ${chefDeFile} n’a pas d’email`)
    }

    if (!perimetre || perimetre.length === 0) {
      console.error(`⚠️ Le chef de file ${chefDeFile} n’a pas de périmètre`)
    }

    if (signataireCharte !== false || signataireCharte !== true) {
      console.error(`⚠️ Le chef de file ${chefDeFile} n’a pas de champ "signataireCharte" renseigné`)
    }

    return {
      nom: chefDeFile,
      email: chefDeFileEmail,
      perimetre: perimetre || [],
      signataireCharte: signataireCharte || false
    }
  })
  const chefsDeFileCount = chefsDeFile.length
  console.log(`ℹ️ Nombre de chefs de file trouvés : ${chefsDeFileCount}`)

  return {clients, mandataires, chefsDeFile}
}

async function main() {
  const clientsYML = yaml.load(readFileSync(join(__dirname, '..', 'clients.yml'), 'utf8'))
  const data = integrityCheck(clientsYML)

  await mongo.connect()

  await populateClients(data)
  await updateRevisionsClients()
  await updateHabilitationsClients()

  await mongo.disconnect()
}

async function populateClients(data) {
  const now = new Date()

  // Fusion des mandataires
  const mandataires = unionWith(data.mandataires, isEqual).map(mandataire => ({
    ...mandataire,
    _id: new ObjectId(),
    _createdAt: now,
    _updatedAt: now
  }))
  console.log(`Nombre de mandataires fusionnées : ${data.mandataires.length - mandataires.length}`)

  // Fusion des chefs de files
  const chefsDeFile = unionWith(data.chefsDeFile, isEqual).map(chefDeFile => ({
    ...chefDeFile,
    _id: new ObjectId(),
    _createdAt: now,
    _updatedAt: now
  }))
  console.log(`Nombre de chefs de file fusionnées : ${data.chefsDeFile.length - chefsDeFile.length}`)

  // Récupération des clients
  const clients = await Promise.all(data.clients.map(async item => {
    const mandataire = mandataires.find(({nom, email}) => nom === item.mandataire && email === item.mandataireEmail)

    if (!mandataire) {
      throw new Error(`Aucun mandataire n’a été trouvé pour ${item.nom}`)
    }

    const client = {
      _id: new ObjectId(),
      id: item.id,
      mandataire: mandataire._id,
      nom: item.nom,
      token: item.token,
      options: item.options || {relaxMode: false},
      active: item.active || false,
      authorizationStrategy: item.authorizationStrategy
    }

    if (item.chefDeFile) {
      const chefDeFile = chefsDeFile.find(({nom, email}) => nom === item.chefDeFile && email === item.chefDeFileEmail)

      if (!chefDeFile) {
        throw new Error(`Aucun chef de file n’a été trouvé pour ${item.nom}`)
      }

      client.chefDeFile = chefDeFile._id
    }

    return client
  }))

  await mongo.db.collection('mandataires').insertMany(mandataires)
  const countMandataires = await mongo.db.collection('mandataires').count()
  console.log(`${countMandataires} mandataires ajouté en base.`)

  await mongo.db.collection('chefs_de_file').insertMany(chefsDeFile)
  const countChefsDeFile = await mongo.db.collection('chefs_de_file').count()
  console.log(`${countChefsDeFile} chefs_de_file ajouté en base.`)

  await mongo.db.collection('clients').insertMany(clients)
  const countClients = await mongo.db.collection('clients').count()
  console.log(`${countClients} clients ajouté en base.`)
}

async function updateRevisionsClients() {
  const clients = await mongo.db.collection('clients').find().toArray()

  // Remplace l'ancien objet client des révisions par le nouvel id mongo
  await Promise.all(clients.map(
    async client => mongo.db.collection('revisions').updateMany({'client.id': client.id}, {
      $set: {client: client._id}
    })))
}

async function updateHabilitationsClients() {
  const clients = await mongo.db.collection('clients').find().toArray()

  // Remplace l'ancien objet client des habilitations par le nouvel id mongo
  await Promise.all(clients.map(
    async client => mongo.db.collection('habilitations').updateMany({'client.id': client.id}, {
      $set: {client: client._id}
    })))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
