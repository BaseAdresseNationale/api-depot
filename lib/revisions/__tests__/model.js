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
    client: {nom: 'ACME'},
    status: 'accepted',
    emailCommune: 'breux.sur.avre@wanadoo.fr',
    createdAt: null,
    updatedAt: null,
    expiresAt: null,
    strategy: {}
  })

  const validatedHabilitation = await Revisions.getRelatedHabilitation(habilitationId, {
    codeCommune: '27115',
    client: {nom: 'ACME'}
  })

  t.deepEqual(validatedHabilitation, {
    _id: habilitationId,
    codeCommune: '27115',
    client: {nom: 'ACME'},
    status: 'accepted',
    emailCommune: 'breux.sur.avre@wanadoo.fr',
    createdAt: null,
    updatedAt: null,
    expiresAt: null,
    strategy: {}
  })
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

  const context = {
    codeCommune: '27115',
    client: {nom: 'ACME', token: 'xxxxxxxxxxxxxxx'}
  }

  await t.throwsAsync(Revisions.getRelatedHabilitation(pendingHabilitationId, context), {message: 'L’habilitation fournie n’est pas valide'})
  await t.throwsAsync(Revisions.getRelatedHabilitation(rejectedHabilitationId, context), {message: 'L’habilitation fournie n’est pas valide'})
})

test('ensure habilitation / different codeCommune', async t => {
  const habilitationId = new mongo.ObjectId()
  await mongo.db.collection('habilitations').insertOne({
    _id: habilitationId,
    codeCommune: '27000',
    client: {nom: 'ACME'},
    status: 'accepted'
  })

  const context = {
    codeCommune: '27115',
    client: {nom: 'ACME'}
  }

  return t.throwsAsync(Revisions.getRelatedHabilitation(habilitationId, context), {message: 'L’habilitation fournie ne concerne pas cette commune'})
})

test('ensure habilitation / different client', async t => {
  const habilitationId = new mongo.ObjectId()
  await mongo.db.collection('habilitations').insertOne({
    _id: habilitationId,
    codeCommune: '27115',
    client: {nom: 'ACME'},
    status: 'accepted'
  })

  const context = {
    codeCommune: '27115',
    client: {nom: 'WB'}
  }

  return t.throwsAsync(Revisions.getRelatedHabilitation(habilitationId, context), {message: 'L’habilitation fournie ne provient pas du même client'})
})
