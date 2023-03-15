const createError = require('http-errors')
const mongo = require('../util/mongo')

async function lock(code) {
  // On ajoute un flag afin d'éviter les publications concurrentes pour cette commune
  const commune = await mongo.db.collection('communes').updateOne(
    {code},
    {$set: {publishing: true}},
    {upsert: true}
  )

  const now = new Date()

  // Si aucune commune n'a été modifiée ou créée, alors une publication est déjà en cours
  if (commune.modifiedCount === 0 && commune.upsertedCount === 0) {
    throw createError(409, 'Une publication est déjà en cours')
  }

  // On ajoute un chronomètre lié à 'publishing' pour détecter les publications expirées
  await mongo.db.collection('communes').updateOne({code}, {$set: {publishingSince: now}})
}

async function unlock(code) {
  // Suppression du verrou et du chronomètre d’une commune
  await mongo.db.collection('communes').updateOne(
    {code},
    {$set: {publishing: false}, $unset: {publishingSince: 1}}
  )
}

module.exports = {
  lock,
  unlock
}
