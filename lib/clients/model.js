const createError = require('http-errors')
const Joi = require('joi')
const {pick, omit} = require('lodash')
const mongo = require('../util/mongo')
const {validObjectID, validPayload} = require('../util/payload')

function generateToken() {
  const length = 32
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let token = ''
  for (let i = 0, n = charset.length; i < length; ++i) {
    token += charset.charAt(Math.floor(Math.random() * n))
  }

  return token
}

const createSchema = Joi.object({
  mandataire: Joi.string().custom(validObjectID).required(),
  chefDeFile: Joi.string().custom(validObjectID),
  nom: Joi.string().min(3).max(200).required(),
  active: Joi.boolean().default(false),
  options: Joi.object({
    relaxMode: Joi.boolean().default(false)
  }).default({relaxMode: false})
})

async function create(payload) {
  const client = validPayload(payload, createSchema)

  if (client.chefDeFile) {
    const chefDeFile = await mongo.db.collection('chefs_de_file').findOne({_id: client.chefDeFile})
    if (!chefDeFile) {
      throw createError(400, 'Chef de file introuvable')
    }
  }

  const mandataire = await mongo.db.collection('mandataires').findOne({_id: client.mandataire})
  if (!mandataire) {
    throw createError(400, 'Mandataire introuvable')
  }

  client._id = new mongo.ObjectId()
  client.token = generateToken()
  client.authorizationStrategy = client.chefDeFile ? 'chef-de-file' : 'habilitation'

  mongo.decorateCreation(client)

  await mongo.db.collection('clients').insertOne(client)

  return client
}

const updateSchema = Joi.object({
  mandataire: Joi.string().custom(validObjectID),
  chefDeFile: Joi.string().custom(validObjectID),
  nom: Joi.string().min(3).max(200),
  active: Joi.boolean(),
  options: Joi.object({
    relaxMode: Joi.boolean()
  })
})

async function update(id, payload) {
  const client = validPayload(payload, updateSchema)

  if (Object.keys(client).length === 0) {
    return mongo.db.collection('clients').findOne({_id: id})
  }

  if (client.mandataire) {
    const mandataire = await mongo.db.collection('mandataires').findOne({
      _id: mongo.parseObjectID(client.mandataire)
    })

    if (!mandataire) {
      throw new Error('mandataire introuvable')
    }
  }

  if (client.chefDeFile) {
    const chefDeFile = await mongo.db.collection('chefs_de_file').findOne({
      _id: mongo.parseObjectID(client.chefDeFile)
    })

    if (!chefDeFile) {
      throw new Error('chefDeFile introuvable')
    }
  }

  mongo.decorateModification(client)

  const {value} = await mongo.db.collection('clients').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: client},
    {returnDocument: 'after'}
  )

  if (!value) {
    throw new Error('Client introuvable')
  }

  mongo.touchDocument('mandataires', value.mandataire, value._updated)

  return value
}

function fetch(clientId) {
  try {
    clientId = new mongo.ObjectId(clientId)
  } catch {
    throw createError(404, 'L’identifiant de client est invalide')
  }

  return mongo.db.collection('clients').findOne({_id: clientId})
}

async function fetchAll() {
  return mongo.db.collection('clients').find().toArray()
}

async function computePublicClient(clientId) {
  const client = await mongo.db.collection('clients').findOne({_id: clientId})

  if (!client) {
    throw new Error('Client introuvable')
  }

  const publicClient = pick(client, 'nom', 'id', '_id')

  const mandataire = await mongo.db.collection('mandataires').findOne({_id: client.mandataire})

  if (!mandataire) {
    throw new Error('Mandataire introuvable')
  }

  publicClient.mandataire = mandataire.nom

  if (client.chefDeFile) {
    const chefDeFile = await mongo.db.collection('chefs_de_file').findOne({_id: client.chefDeFile})

    if (!chefDeFile) {
      throw new Error('Chef de file introuvable')
    }

    publicClient.chefDeFile = chefDeFile.nom
  }

  return publicClient
}

function filterSensitiveFields(client) {
  return omit(client, 'token')
}

module.exports = {
  create,
  update,
  fetch,
  fetchAll,
  computePublicClient,
  filterSensitiveFields
}
