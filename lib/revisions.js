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

module.exports = {
  createRevision
}
