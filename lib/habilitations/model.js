const got = require('got')
const {deburr} = require('lodash')
const createError = require('http-errors')
const mongo = require('../util/mongo')
const {exposedFields} = require('../clients/model')

const API_ETABLISSEMENTS_PUBLICS = process.env.API_ETABLISSEMENTS_PUBLICS || 'https://plateforme.adresse.data.gouv.fr/api-annuaire/v3'

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

    franceconnectAuthenticationUrl: `${process.env.API_DEPOT_URL}/habilitations/${_id}/authentication/franceconnect`,

    strategy: null,

    client: exposedFields(client),
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

async function acceptHabilitation(habilitationId, changes) {
  const now = new Date()
  const habilitationEnd = new Date()
  habilitationEnd.setMonth(habilitationEnd.getMonth() + 6)

  await mongo.db.collection('habilitations').updateOne(
    {_id: habilitationId},
    {
      $set: {
        ...changes,
        status: 'accepted',
        updatedAt: now,
        acceptedAt: now,
        expiresAt: habilitationEnd
      }
    }
  )
}

async function rejectHabilitation(habilitationId, changes) {
  const now = new Date()

  await mongo.db.collection('habilitations').updateOne(
    {_id: habilitationId},
    {
      $set: {
        ...changes,
        status: 'rejected',
        updatedAt: now,
        rejectedAt: now
      }
    }
  )
}

function fetchHabilitation(habilitationId) {
  try {
    habilitationId = new mongo.ObjectId(habilitationId)
  } catch {
    throw createError(404, 'L’identifiant de l’habilitation est invalide')
  }

  return mongo.db.collection('habilitations').findOne({_id: habilitationId})
}

module.exports = {createHabilitation, askHabilitation, acceptHabilitation, rejectHabilitation, fetchHabilitation}
