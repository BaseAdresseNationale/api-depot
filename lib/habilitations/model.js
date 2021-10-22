const mongo = require('../util/mongo')
const createError = require('http-errors')
const {getCommuneEmail} = require('./strategies/email')

async function createHabilitation({codeCommune, client}) {
  const now = new Date()
  const _id = new mongo.ObjectId()

  const emailCommune = await getCommuneEmail(codeCommune)

  const habilitation = {
    _id,

    codeCommune,
    emailCommune,

    strategy: null,

    client,
    status: 'pending',

    createdAt: now,
    updatedAt: now,
    expiresAt: null
  }

  await mongo.db.collection('habilitations').insertOne(habilitation)

  return habilitation
}

async function askHabilitation(habilitation, strategy) {
  const changes = {
    updatedAt: new Date(),
    strategy
  }

  await mongo.db.collection('habilitations').updateOne(
    {_id: habilitation._id}, {$set: changes}
  )

  return {...habilitation, ...changes}
}

async function validateHabilitation(habilitation) {
  const {strategy} = habilitation
  const now = new Date()
  const habilitationEnd = new Date()
  habilitationEnd.setMonth(habilitationEnd.getMonth() + 6)

  const changes = {
    ...habilitation,
    status: 'accepted',
    updatedAt: now,
    expiresAt: habilitationEnd,
    strategy: {
      ...strategy,
      validatedAt: now
    }
  }

  await mongo.db.collection('habilitations').updateOne(
    {_id: habilitation._id},
    {$set: changes}
  )

  return changes
}

async function rejectHabilitation(habilitationId) {
  await mongo.db.collection('habilitations').updateOne(
    {_id: habilitationId},
    {$set: {status: 'rejected', updatedAt: new Date()}}
  )

  return fetchHabilitation(habilitationId)
}

async function decreasesRemainingAttempts(habilitationId) {
  await mongo.db.collection('habilitations').updateOne(
    {_id: habilitationId},
    {$inc: {'strategy.remainingAttempts': -1}},
    {$set: {updatedAt: new Date()}}
  )

  return fetchHabilitation(habilitationId)
}

function fetchHabilitation(habilitationId) {
  try {
    habilitationId = new mongo.ObjectId(habilitationId)
  } catch {
    throw createError(404, 'L’identifiant de l’habilitation est invalide')
  }

  return mongo.db.collection('habilitations').findOne({_id: habilitationId})
}

module.exports = {createHabilitation, askHabilitation, validateHabilitation, decreasesRemainingAttempts, rejectHabilitation, fetchHabilitation}
