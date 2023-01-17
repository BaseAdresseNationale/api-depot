const process = require('process')
const hasha = require('hasha')
const {omit, pick} = require('lodash')
const createError = require('http-errors')
const mongo = require('../util/mongo')
const Habilitation = require('../habilitations/model')
const {composeCommune} = require('../util/api-ban')
const {applyValidateBAL} = require('./validate-bal')
const {notifyPublication} = require('./slack')

async function createRevision({context, codeCommune, client}) {
  const now = new Date()
  const _id = new mongo.ObjectId()

  const revision = {
    _id,

    codeCommune,

    context,

    validation: {},

    client,
    status: 'pending',
    ready: false,

    createdAt: now,
    updatedAt: now,
    publishedAt: null
  }

  await mongo.db.collection('revisions').insertOne(revision)

  return revision
}

async function setFile(revision, type, {data, name}) {
  const _id = new mongo.ObjectId()

  const file = {
    _id,
    revisionId: revision._id,

    name,
    type,
    data,
    size: data.length,
    hash: hasha(data, {algorithm: 'sha256'}),

    createdAt: new Date()
  }

  await mongo.db.collection('files').deleteOne({revisionId: revision._id, type})
  await mongo.db.collection('files').insertOne(file)
  await mongo.db.collection('revisions').updateOne(
    {_id: revision._id, status: 'pending'},
    {$set: {updatedAt: new Date(), ready: false}}
  )

  return omit(file, 'data')
}

async function getFiles(revision) {
  return mongo.db.collection('files')
    .find({revisionId: revision._id})
    .project({data: 0, revisionId: 0})
    .toArray()
}

async function getFileData(fileId) {
  const file = await mongo.db.collection('files').findOne({_id: fileId})
  return file.data.buffer
}

async function computeRevision(revision) {
  const files = await getFiles(revision)
  const balFiles = files.filter(f => f.type === 'bal')

  if (balFiles.length !== 1) {
    throw createError(400, 'Un fichier de type `bal` doit être fourni')
  }

  const {validation} = await applyValidateBAL(
    await getFileData(balFiles[0]._id),
    revision.codeCommune,
    {relaxMode: revision.client.options?.relaxMode}
  )

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

  if (habilitation.client.nom !== client.nom) {
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

  await notifyPublication({
    codeCommune: revision.codeCommune,
    publicationType,
    habilitationStrategy: habilitation?.strategy.type,
    client
  })

  return {...revision, ...changes}
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

function getRevisionsByCommune(codeCommune) {
  return mongo.db.collection('revisions').find({codeCommune, status: 'published'}).sort({publishedAt: 1}).toArray()
}

function getCurrentRevisions(publishedSince) {
  const publishedSinceQuery = publishedSince ? {publishedAt: {$gt: publishedSince}} : {}

  return mongo.db.collection('revisions')
    .find({current: true, ...publishedSinceQuery})
    .project({codeCommune: 1, publishedAt: 1, 'client.id': 1, 'client.nom': 1})
    .toArray()
}

module.exports = {
  createRevision,
  setFile,
  getFiles,
  getFileData,
  publishRevision,
  fetchRevision,
  getCurrentRevision,
  getRevisionsByCommune,
  computeRevision,
  getCurrentRevisions,
  getRelatedHabilitation
}
