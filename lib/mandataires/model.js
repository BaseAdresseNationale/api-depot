const createError = require('http-errors')
const Joi = require('joi')
const mongo = require('../util/mongo')
const {validPayload} = require('../util/payload')

const createSchema = Joi.object({
  nom: Joi.string().min(3).max(200).required(),
  email: Joi.string().email().required()
})

const updateSchema = Joi.object({
  nom: Joi.string().min(3).max(200),
  email: Joi.string().email()
})

async function create(payload) {
  const mandataire = validPayload(payload, createSchema)

  mongo.decorateCreation(mandataire)

  await mongo.db.collection('mandataires').insertOne(mandataire)

  return mandataire
}

async function update(id, payload) {
  const mandataire = validPayload(payload, updateSchema)

  if (Object.keys(mandataire).length === 0) {
    return mongo.db.collection('mandataires').findOne({_id: id})
  }

  mongo.decorateModification(mandataire)

  const {value} = await mongo.db.collection('mandataires').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: mandataire},
    {returnDocument: 'after'}
  )

  if (!value) {
    throw new Error('mandataire introuvable')
  }

  return value
}

function fetch(mandataireId) {
  try {
    mandataireId = new mongo.ObjectId(mandataireId)
  } catch {
    throw createError(404, 'L’identifiant de mandataire est invalide')
  }

  return mongo.db.collection('mandataires').findOne({_id: mandataireId})
}

module.exports = {
  create,
  update,
  fetch
}
