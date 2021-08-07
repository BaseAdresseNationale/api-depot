const hasha = require('hasha')
const {omit} = require('lodash')
const createError = require('http-errors')
const {applyValidateBAL} = require('./validate-bal')
const mongo = require('./util/mongo')

async function createRevision({nomComplet, organisation, extras, codeCommune, client}) {
  const now = new Date()
  const _id = new mongo.ObjectID()

  const revision = {
    _id,

    codeCommune,

    nomComplet,
    organisation,
    extras,

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

async function addFile(revision, {data, type, name}) {
  const _id = new mongo.ObjectID()

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
  return file.data
}

async function computeRevision(revision) {
  const files = await getFiles(revision)
  const balFiles = files.filter(f => f.type === 'bal')

  if (balFiles.length !== 1) {
    throw createError(400, 'Un fichier de type `bal` doit être fourni')
  }

  const {validation} = await applyValidateBAL(
    await getFileData(balFiles[0]._id),
    revision.codeCommune
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

async function publishRevision(revision) {
  const now = new Date()

  const changes = {
    publishedAt: now,
    updatedAt: now,
    ready: null,
    status: 'published'
  }

  await mongo.db.collection('revisions').updateOne({_id: revision._id}, {$set: changes})
  await mongo.db.collection('revisions').updateMany(
    {codeCommune: revision.codeCommune, status: 'pending', _id: {$ne: revision._id}},
    {$set: {ready: false}}
  )

  return {...revision, ...changes}
}

function fetchRevision(revisionId) {
  try {
    revisionId = new mongo.ObjectID(revisionId)
  } catch {
    throw createError(404, 'L’identifiant de révision est invalide')
  }

  return mongo.db.collection('revisions').findOne({_id: revisionId})
}

module.exports = {
  createRevision,
  addFile,
  getFiles,
  publishRevision,
  fetchRevision,
  computeRevision
}
