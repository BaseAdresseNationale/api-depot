const got = require('got')
const mongo = require('../util/mongo')
const {deburr} = require('lodash')
const createError = require('http-errors')

async function getCommuneEmail(codeCommune) {
  try {
    const response = await got(`${API_ETABLISSEMENTS_PUBLICS}/communes/${codeCommune}/mairie`, {responseType: 'json'})
    const mairie = response.body.features
      .find(m => !normalize(m.properties.nom).includes('deleguee'))

    const {email} = mairie.properties
    if (validateEmail(email)) {
      return email
    }

    throw new Error(`L’adresse email " ${email} " ne peut pas être utilisée`)
  } catch (error) {
    console.log(`Une erreur s’est produite lors de la récupération de l’adresse email de la mairie (Code commune: ${codeCommune}).`, error)
  }
}

function normalize(str) {
  return deburr(str).toLowerCase()
}

const API_ETABLISSEMENTS_PUBLICS = process.env.API_ETABLISSEMENTS_PUBLICS || 'https://etablissements-publics.api.gouv.fr/v3'

function validateEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[(?:\d{1,3}\.){3}\d{1,3}])|(([a-zA-Z\-\d]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}

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
  const now = new Date()
  const habilitationEnd = new Date()
  habilitationEnd.setMonth(habilitationEnd.getMonth() + 6)

  const changes = {
    ...habilitation,
    status: 'accepted',
    updatedAt: now,
    expiresAt: habilitationEnd
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

function fetchHabilitation(habilitationId) {
  try {
    habilitationId = new mongo.ObjectId(habilitationId)
  } catch {
    throw createError(404, 'L’identifiant de l’habilitation est invalide')
  }

  return mongo.db.collection('habilitations').findOne({_id: habilitationId})
}

module.exports = {createHabilitation, askHabilitation, validateHabilitation, rejectHabilitation, fetchHabilitation}
