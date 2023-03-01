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

test.afterEach.always(async () => {
  await mongo.db.collection('revisions').deleteMany({})
})

test('ensure habilitation / valid', async t => {
  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({
    _id: mandataireId,
    nom: 'mandataire'
  })

  const clientId = new mongo.ObjectId()
  await mongo.db.collection('clients').insertOne({
    _id: clientId,
    mandataire: mandataireId,
    nom: 'ACME'
  })

  const habilitationId = new mongo.ObjectId()
  await mongo.db.collection('habilitations').insertOne({
    _id: habilitationId,
    codeCommune: '27115',
    client: clientId,
    status: 'accepted',
    emailCommune: 'mairie@breux-sur-avre.fr',
    createdAt: null,
    updatedAt: null,
    expiresAt: null,
    strategy: {}
  })

  const validatedHabilitation = await Revisions.getRelatedHabilitation(habilitationId, {
    codeCommune: '27115',
    client: {_id: clientId}
  })

  t.deepEqual(validatedHabilitation, {
    _id: habilitationId,
    codeCommune: '27115',
    client: clientId,
    status: 'accepted',
    emailCommune: 'mairie@breux-sur-avre.fr',
    createdAt: null,
    updatedAt: null,
    expiresAt: null,
    strategy: {}
  })
})

test('ensure habilitation / habilitation not accepted', async t => {
  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({
    _id: mandataireId,
    nom: 'mandataire'
  })

  const clientId = new mongo.ObjectId()
  await mongo.db.collection('clients').insertOne({
    _id: clientId,
    mandataire: mandataireId,
    nom: 'ACME',
    token: 'xxxxxxxxxxxxxxx'
  })

  const pendingHabilitationId = new mongo.ObjectId()
  await mongo.db.collection('habilitations').insertOne({
    _id: pendingHabilitationId,
    codeCommune: '27115',
    client: clientId,
    status: 'pending'
  })

  const rejectedHabilitationId = new mongo.ObjectId()
  await mongo.db.collection('habilitations').insertOne({
    _id: rejectedHabilitationId,
    codeCommune: '27115',
    client: clientId,
    status: 'rejected'
  })

  const context = {
    codeCommune: '27115',
    client: {_id: clientId}
  }

  await t.throwsAsync(Revisions.getRelatedHabilitation(pendingHabilitationId, context), {message: 'L’habilitation fournie n’est pas valide'})
  await t.throwsAsync(Revisions.getRelatedHabilitation(rejectedHabilitationId, context), {message: 'L’habilitation fournie n’est pas valide'})
})

test.serial('ensure habilitation / different codeCommune', async t => {
  const clientId = new mongo.ObjectId()
  await mongo.db.collection('clients').insertOne({
    _id: clientId,
    nom: 'ACME'
  })

  const habilitationId = new mongo.ObjectId()
  await mongo.db.collection('habilitations').insertOne({
    _id: habilitationId,
    codeCommune: '27000',
    client: clientId,
    status: 'accepted'
  })

  const context = {
    codeCommune: '27115',
    client: {_id: clientId}
  }

  return t.throwsAsync(Revisions.getRelatedHabilitation(habilitationId, context), {message: 'L’habilitation fournie ne concerne pas cette commune'})
})

test('ensure habilitation / different client', async t => {
  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({
    _id: mandataireId,
    nom: 'mandataire'
  })

  const clientId = new mongo.ObjectId()
  await mongo.db.collection('clients').insertOne({
    _id: clientId,
    mandataire: mandataireId,
    nom: 'ACME'
  })

  const habilitationId = new mongo.ObjectId()
  await mongo.db.collection('habilitations').insertOne({
    _id: habilitationId,
    codeCommune: '27115',
    client: clientId,
    status: 'accepted'
  })

  const context = {
    codeCommune: '27115',
    client: {_id: new mongo.ObjectId()}
  }

  return t.throwsAsync(Revisions.getRelatedHabilitation(habilitationId, context), {message: 'L’habilitation fournie ne provient pas du même client'})
})

test.serial('getCurrentRevisions / commune actuelle', async t => {
  await mongo.db.collection('revisions').insertOne({
    _id: new mongo.ObjectId(),
    codeCommune: '27115', // Breux-sur-Avre commune actuelle COG 2022
    current: true
  })

  const currentRevisions = await Revisions.getCurrentRevisions()
  t.is(currentRevisions.length, 1)
  t.is(currentRevisions[0].codeCommune, '27115')
})

test.serial('getCurrentRevisions / commune déléguée', async t => {
  await mongo.db.collection('revisions').insertOne({
    _id: new mongo.ObjectId(),
    codeCommune: '26219', // Mureils commune déléguée COG 2022
    current: true
  })

  const currentRevisions = await Revisions.getCurrentRevisions()
  t.is(currentRevisions.length, 0)
})
