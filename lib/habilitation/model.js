const mongo = require('../util/mongo')
const createError = require('http-errors')

async function createHabilitation({context, codeCommune, client}) {
  const now = new Date()
  const _id = new mongo.ObjectID()

  const habilitation = {
    _id,

    codeCommune,

    context,
    method: null,

    client,
    status: 'pending',

    createdAt: now,
    updatedAt: now,
    expiredAt: null
  }

  await mongo.db.collection('habilitations').insertOne(habilitation)

  return habilitation
}

function fetchHabilitation(habilitationId) {
  try {
    habilitationId = new mongo.ObjectID(habilitationId)
  } catch {
    throw createError(404, 'L’identifiant de l’habilitation est invalide')
  }

  return mongo.db.collection('habilitations').findOne({_id: habilitationId})
}

module.exports = {createHabilitation, fetchHabilitation}
