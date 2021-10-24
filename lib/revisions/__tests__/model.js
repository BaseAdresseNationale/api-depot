const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const Revisions = require('../model')

let mongod

test.before('start server', async () => {
  mongod = await MongoMemoryServer.create()
  await mongo.connect(mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test('ensure habilitation / valid', async t => {
  const habilitationId = new mongo.ObjectId()
  await mongo.db.collection('habilitations').insertOne({
    _id: habilitationId,
    codeCommune: '27115',
    client: {nom: 'ACME', token: 'xxxxxxxxxxxxxxx'},
    status: 'accepted',
    emailCommune: 'breux.sur.avre@wanadoo.fr',
    createdAt: null,
    updatedAt: null,
    expiresAt: null,
    strategy: {
      validatedAt: null
    }
  })

  const revision = {
    codeCommune: '27115',
    client: {nom: 'ACME', token: 'xxxxxxxxxxxxxxx'}
  }

  const validatedHabilitation = await Revisions.ensureHabilitation(revision, habilitationId)
  const keys = ['_id', 'emailCommune', 'codeCommune', 'createdAt', 'updatedAt', 'expiresAt', 'strategy']
  t.true(keys.every(k => k in validatedHabilitation))
})

test('ensure habilitation / habilitation not accepted', async t => {
  const pendingHabilitationId = new mongo.ObjectId()
  await mongo.db.collection('habilitations').insertOne({
    _id: pendingHabilitationId,
    codeCommune: '27115',
    client: {nom: 'ACME', token: 'xxxxxxxxxxxxxxx'},
    status: 'pending'
  })

  const rejectedHabilitationId = new mongo.ObjectId()
  await mongo.db.collection('habilitations').insertOne({
    _id: rejectedHabilitationId,
    codeCommune: '27115',
    client: {nom: 'ACME', token: 'xxxxxxxxxxxxxxx'},
    status: 'rejected'
  })

  const revision = {
    codeCommune: '27115',
    client: {nom: 'ACME', token: 'xxxxxxxxxxxxxxx'}
  }

  await t.throwsAsync(Revisions.ensureHabilitation(revision, pendingHabilitationId), {message: 'L’habilitation fournie n’est pas valide'})
  await t.throwsAsync(Revisions.ensureHabilitation(revision, rejectedHabilitationId), {message: 'L’habilitation fournie n’est pas valide'})
})

test('ensure habilitation / different codeCommune', async t => {
  const habilitationId = new mongo.ObjectId()
  await mongo.db.collection('habilitations').insertOne({
    _id: habilitationId,
    codeCommune: '27000',
    client: {nom: 'ACME', token: 'xxxxxxxxxxxxxxx'},
    status: 'accepted'
  })

  const revision = {
    codeCommune: '27115',
    client: {nom: 'ACME', token: 'xxxxxxxxxxxxxxx'}
  }

  return t.throwsAsync(Revisions.ensureHabilitation(revision, habilitationId), {message: 'L’habilitation fournie ne concerne pas cette commune'})
})

test('ensure habilitation / different client', async t => {
  const habilitationId = new mongo.ObjectId()
  await mongo.db.collection('habilitations').insertOne({
    _id: habilitationId,
    codeCommune: '27115',
    client: {nom: 'ACME', token: 'xxxxxxxxxxxxxxx'},
    status: 'accepted'
  })

  const revision = {
    codeCommune: '27115',
    client: {nom: 'WB', token: 'ooooooooooooooo'}
  }

  return t.throwsAsync(Revisions.ensureHabilitation(revision, habilitationId), {message: 'L’habilitation fournie ne provient pas du même client'})
})
