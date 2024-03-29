const process = require('process')
const hasha = require('hasha')
const {pick, keyBy} = require('lodash')
const createError = require('http-errors')
const mongo = require('../util/mongo')
const Habilitation = require('../habilitations/model')
const {composeCommune} = require('../util/api-ban')
const Client = require('../clients/model')
const {isCommuneActuelle} = require('../util/cog')
const Commune = require('../communes/model')
const {s3Service} = require('../files/s3.service')
const {applyValidateBAL} = require('./validate-bal')
const {notifyPublication} = require('./slack')
const {notifyPartnersOnForcePublish} = require('./notify-partners')

async function createRevision({context, codeCommune, client}) {
  const now = new Date()
  const _id = new mongo.ObjectId()

  const revision = {
    _id,

    codeCommune,

    context,

    validation: {},

    client: client._id,
    status: 'pending',
    ready: false,

    createdAt: now,
    updatedAt: now,
    publishedAt: null
  }

  await mongo.db.collection('revisions').insertOne(revision)

  return revision
}

async function isFileExist(revisionId, type) {
  return mongo.db.collection('files').findOne({revisionId, type})
}

async function setFile(revision, type, {data, name}) {
  const _id = new mongo.ObjectId()

  const file = {
    _id,
    revisionId: revision._id,
    name,
    type,
    size: data.length,
    hash: hasha(data, {algorithm: 'sha256'}),
    createdAt: new Date()
  }

  // INSERT NEW FILE
  await s3Service.uploadS3File({filename: _id.toHexString(), data})
  await mongo.db.collection('files').insertOne(file)

  // SET REVISION IF READY
  await mongo.db.collection('revisions').updateOne(
    {_id: revision._id, status: 'pending'},
    {$set: {updatedAt: new Date(), ready: false}}
  )

  return file
}

async function getFiles(revision) {
  return mongo.db.collection('files')
    .find({revisionId: revision._id})
    .project({revisionId: 0})
    .toArray()
}

async function getFileData(fileId) {
  // GET BUFFER FILE
  const data = await s3Service.getS3File(fileId.toHexString())
  return Buffer.from(data)
}

async function checkRemoveLotNumeros(codeCommune, validation) {
  const currentRevision = await getCurrentRevision(codeCommune)
  const nbRows = currentRevision?.validation?.rowsCount || 0
  const newNbRows = validation.rowsCount
  // REMOVE > 20%
  if (nbRows * 0.2 < nbRows - newNbRows) {
    validation.warnings.push('rows.delete_many_addresses')
  }
}

async function computeRevision(revision) {
  const files = await getFiles(revision)
  const balFiles = files.filter(f => f.type === 'bal')

  if (balFiles.length !== 1) {
    throw createError(400, 'Un fichier de type `bal` doit être fourni')
  }

  const client = await Client.fetch(revision.client)
  if (!client) {
    throw createError(400, 'Client introuvable')
  }

  const {validation} = await applyValidateBAL(
    await getFileData(balFiles[0]._id),
    revision.codeCommune,
    client,
    {relaxMode: client.options?.relaxMode}
  )

  await checkRemoveLotNumeros(revision.codeCommune, validation)

  const changes = {
    updatedAt: new Date(),
    validation,
    ready: Boolean(validation.valid)
  }

  await mongo.db.collection('revisions').updateOne(
    {_id: revision._id, status: 'pending'},
    {$set: changes}
  )

  return {...revision, ...changes}
}

async function getRelatedHabilitation(habilitationId, {client, codeCommune}) {
  const habilitation = await Habilitation.fetchHabilitation(habilitationId)

  if (!habilitation) {
    throw createError(412, 'L’habilitation fournie n’est pas connue')
  }

  if (habilitation.client.toString() !== client._id.toString()) {
    throw createError(412, 'L’habilitation fournie ne provient pas du même client')
  }

  if (habilitation.codeCommune !== codeCommune) {
    throw createError(412, 'L’habilitation fournie ne concerne pas cette commune')
  }

  if (habilitation.status !== 'accepted') {
    throw createError(412, 'L’habilitation fournie n’est pas valide')
  }

  return habilitation
}

async function publishRevision(revision, {client, habilitation}) {
  // Vérouille la publication d'autre révision sur la commune
  await Commune.lockPublishing(revision.codeCommune)

  const now = new Date()
  const changes = {
    publishedAt: now,
    updatedAt: now,
    ready: null,
    status: 'published',
    current: true
  }

  if (habilitation) {
    changes.habilitation = pick(habilitation, [
      '_id',
      'emailCommune',
      'codeCommune',
      'createdAt',
      'updatedAt',
      'expiresAt',
      'strategy'
    ])
  }

  try {
    const prevRevision = await getCurrentRevision(revision.codeCommune)

    await mongo.db.collection('revisions').updateOne({_id: revision._id}, {$set: changes})

    // On supprime le flag current pour toutes les anciennes révisions publiées de cette commune
    const removeCurrentResult = await mongo.db.collection('revisions').updateMany(
      {codeCommune: revision.codeCommune, current: true, status: 'published', _id: {$ne: revision._id}},
      {$set: {current: false}}
    )

    const publicationType = removeCurrentResult.matchedCount > 0 ? 'update' : 'creation'

    // On invalide toutes les révisions en attente pour cette commune
    await mongo.db.collection('revisions').updateMany(
      {codeCommune: revision.codeCommune, status: 'pending', _id: {$ne: revision._id}},
      {$set: {ready: false}}
    )

    if (process.env.NOTIFY_BAN === '1') {
      try {
        await composeCommune(revision.codeCommune)
      } catch (error) {
        console.error(error)
      }
    }

    const publicClient = await Client.computePublicClient(client._id)

    await notifyPublication({
      codeCommune: revision.codeCommune,
      publicationType,
      habilitationStrategy: habilitation?.strategy.type,
      client: publicClient
    })

    // On notifie les partenaires si une commune qui était gérée par un partenaire
    //  force une publication via mes-adresses
    await notifyPartnersOnForcePublish({
      prevRevision,
      currentRevision: revision
    })

    return {...revision, ...changes}
  } catch (error) {
    throw new Error(error)
  } finally {
    // Déverrouille la publication à d'autres révisions pour cette commune
    await Commune.unlockPublishing(revision.codeCommune)
  }
}

function fetchRevision(revisionId) {
  try {
    revisionId = new mongo.ObjectId(revisionId)
  } catch {
    throw createError(404, 'L’identifiant de révision est invalide')
  }

  return mongo.db.collection('revisions').findOne({_id: revisionId})
}

function getCurrentRevision(codeCommune) {
  return mongo.db.collection('revisions').findOne({codeCommune, current: true})
}

function getRevisionsByCommune(codeCommune, status) {
  const filters = {
    codeCommune,
    status: 'published'
  }

  if (status === 'all') {
    delete filters.status
  } else if (status === 'pending') {
    filters.status = 'pending'
  }

  return mongo.db.collection('revisions')
    .find({...filters})
    .sort({publishedAt: 1})
    .toArray()
}

async function getCurrentRevisions(publishedSince) {
  const publishedSinceQuery = publishedSince ? {publishedAt: {$gt: publishedSince}} : {}

  const revisions = await mongo.db.collection('revisions')
    .find({current: true, ...publishedSinceQuery})
    .project({codeCommune: 1, publishedAt: 1, client: 1})
    .toArray()

  return revisions.filter(r => isCommuneActuelle(r.codeCommune))
}

async function expandWithClient(revision) {
  const publicClient = await Client.computePublicClient(revision.client)
  return {...revision, client: publicClient}
}

async function expandWithClients(revisions) {
  const clients = await mongo.db.collection('clients').find({_id: {$in: revisions.map(r => r.client)}}).toArray()
  const publicClients = await Promise.all(clients.map(client => Client.computePublicClient(client._id)))
  const clientsById = keyBy(publicClients, '_id')

  return revisions.map(r => ({
    ...r,
    client: clientsById[r.client.toString()]
  }))
}

async function getRevisionsPublishedBetweenDate(dates) {
  return mongo.db.collection('revisions').find(
    {
      publishedAt: {
        $gte: dates.from,
        $lte: dates.to
      }
    }
  ).toArray()
}

async function getFirstRevisionsPublishedByCommune() {
  return mongo.db.collection('revisions').aggregate([
    {
      $match: {
        publishedAt: {
          $ne: null
        }
      }
    },
    {
      $group: {
        _id: {codeCommune: '$codeCommune'},
        publishedAt: {$first: '$publishedAt'},
        client: {$first: '$client'}
      }
    }
  ]).toArray()
}

module.exports = {
  createRevision,
  isFileExist,
  setFile,
  getFiles,
  getFileData,
  publishRevision,
  fetchRevision,
  getCurrentRevision,
  getRevisionsByCommune,
  computeRevision,
  getCurrentRevisions,
  getRelatedHabilitation,
  expandWithClient,
  expandWithClients,
  getRevisionsPublishedBetweenDate,
  getFirstRevisionsPublishedByCommune
}
