const hasha = require('hasha')
const {omit} = require('lodash')
const createError = require('http-errors')
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

async function addFile(revision, fileBuffer, {type, name}) {
  const _id = new mongo.ObjectID()

  const file = {
    _id,
    revisionId: revision._id,

    name,
    type,
    data: fileBuffer,
    size: fileBuffer.length,
    hash: hasha(fileBuffer, {algorithm: 'sha256'}),

    createdAt: new Date()
  }

  await mongo.db.collection('files').insertOne(file)
  await mongo.db.collection('revisions').updateOne(
    {_id: revision._id},
    {$set: {updatedAt: new Date()}}
  )

  return omit(file, 'data')
}

async function publishRevision(revision) {
  if (revision.status !== 'pending' || !revision.ready) {
    throw createError(403, 'La publication n’est pas possible')
  }

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
  publishRevision,
  fetchRevision
}
