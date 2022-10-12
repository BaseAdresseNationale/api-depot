#!/usr/bin/env node
const {join} = require('path')
const {readFileSync} = require('fs')
const yaml = require('js-yaml')
const {unionWith, isEqual} = require('lodash')

const mongo = require('../lib/util/mongo')
const {ObjectId} = require('../lib/util/mongo')

async function main() {
  await mongo.connect()
  const now = new Date()

  const clientsYml = yaml.load(readFileSync(join(__dirname, '..', 'clients.yml'), 'utf8'))

  // Récupération et fusion des mandataires
  const clientsMandataires = clientsYml.map(client => ({
    nom: client.mandataire,
    email: client.mandataireEmail
  }))
  const mandataires = unionWith(clientsMandataires, isEqual).map(mandataire => ({
    ...mandataire,
    _id: new ObjectId(),
    _createdAt: now,
    _updatedAt: now
  }))

  await mongo.db.collection('mandataires').insertMany(mandataires)

  // Récupération des chefs de files
  const clientsChefsDeFile = clientsYml.filter(client => client.chefDeFile).map(client => ({
    nom: client.chefDeFile,
    email: client.chefDeFileEmail,
    perimetreConvention: client.perimetreConvention,
    signataireCharte: client.signataireCharte
  }))
  const chefsDeFile = unionWith(clientsChefsDeFile, isEqual).map(chefDeFile => ({
    ...chefDeFile,
    _id: new ObjectId(),
    _createdAt: now,
    _updatedAt: now
  }))

  await mongo.db.collection('chefs_de_file').insertMany(chefsDeFile)

  // Récupération des clients
  const clients = await Promise.all(clientsYml.map(async item => {
    const mandataire = await mongo.db.collection('mandataires').findOne({nom: item.mandataire, email: item.mandataireEmail})
    const client = {
      _id: new ObjectId(),
      mandataire: mandataire._id,
      nom: item.nom,
      token: item.token,
      options: item.options,
      active: item.active,
      authorizationStrategy: item.authorizationStrategy
    }

    if (item.chefDeFile) {
      const chefDeFile = await mongo.db.collection('chefs_de_file').findOne({nom: item.chefDeFile, email: item.chefDeFileEmail})
      client.chefDeFile = chefDeFile._id
    }

    return client
  }))

  await mongo.db.collection('clients').insertMany(clients)

  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
