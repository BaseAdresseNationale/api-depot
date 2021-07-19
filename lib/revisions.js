const hasha = require('hasha')
const {omit} = require('lodash')
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

async function addFile(revision, fileBuffer, {name}) {
  const _id = new mongo.ObjectID()

  const file = {
    _id,
    revisionId: revision._id,

    name,
    type: 'bal',
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

module.exports = {
  createRevision,
  addFile
}
