const {join} = require('path')
const {readFile} = require('fs').promises
const test = require('ava')
const {sub} = require('date-fns')
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

test.serial('getRevisionsPublishedBetweenDate', async t => {
  const revisions = [
    {
      _id: new mongo.ObjectId(),
      publishedAt: sub(new Date(), {days: 2})
    },
    {
      _id: new mongo.ObjectId(),
      publishedAt: sub(new Date(), {days: 5})
    },
    {
      _id: new mongo.ObjectId(),
      publishedAt: sub(new Date(), {days: 10})
    },
    {
      _id: new mongo.ObjectId(),
      publishedAt: null
    }
  ]
  await mongo.db.collection('revisions').insertMany(revisions)
  const res0 = await Revisions.getRevisionsPublishedBetweenDate({from: sub(new Date(), {days: 1}), to: new Date()})
  t.is(res0.length, 0)
  const res1 = await Revisions.getRevisionsPublishedBetweenDate({from: sub(new Date(), {days: 3}), to: new Date()})
  t.is(res1.length, 1)
  const res2 = await Revisions.getRevisionsPublishedBetweenDate({from: sub(new Date(), {days: 6}), to: new Date()})
  t.is(res2.length, 2)
  const res3 = await Revisions.getRevisionsPublishedBetweenDate({from: sub(new Date(), {days: 11}), to: new Date()})
  t.is(res3.length, 3)
})

test.serial('getFirstRevisionsPublishedByCommune', async t => {
  const revisions = [
    {
      _id: new mongo.ObjectId(),
      codeCommune: '00000',
      publishedAt: sub(new Date(), {days: 2})
    },
    {
      _id: new mongo.ObjectId(),
      codeCommune: '00000',
      publishedAt: sub(new Date(), {days: 5})
    },
    {
      _id: new mongo.ObjectId(),
      codeCommune: '00000',
      publishedAt: sub(new Date(), {days: 10})
    },
    {
      _id: new mongo.ObjectId(),
      codeCommune: '00001',
      publishedAt: sub(new Date(), {days: 1})
    },
    {
      _id: new mongo.ObjectId(),
      codeCommune: '00002'
    }
  ]
  await mongo.db.collection('revisions').insertMany(revisions)
  const res = await Revisions.getFirstRevisionsPublishedByCommune()
  t.is(res.length, 2)
})

test.serial('computeRevision', async t => {
  const client = {
    _id: new mongo.ObjectId(),
    active: true,
    name: 'Test'
  }

  await mongo.db.collection('clients').insertOne(client)

  const revision = {
    _id: new mongo.ObjectId(),
    client: client._id,
    codeCommune: '71346'
  }

  await mongo.db.collection('revisions').insertOne(revision)

  const data = await readFile(join(__dirname, 'fixtures', 'test-valid.csv'))
  const files = {
    _id: new mongo.ObjectId(),
    revisionId: revision._id,
    type: 'bal',
    data
  }

  await mongo.db.collection('files').insertOne(files)

  const {validation} = await Revisions.computeRevision(revision)

  t.is(validation.valid, true)
  t.deepEqual(validation.errors, [])
  t.deepEqual(validation.warnings, [])
  t.deepEqual(validation.infos, [])
})

test.serial('computeRevision with relax mode', async t => {
  const client = {
    _id: new mongo.ObjectId(),
    active: true,
    name: 'Test',
    options: {relaxMode: true}
  }

  await mongo.db.collection('clients').insertOne(client)

  const revision = {
    _id: new mongo.ObjectId(),
    client: client._id,
    codeCommune: '71346'
  }

  await mongo.db.collection('revisions').insertOne(revision)

  const data = await readFile(join(__dirname, 'fixtures', 'test-valid-relax.csv'))
  const files = {
    _id: new mongo.ObjectId(),
    revisionId: revision._id,
    type: 'bal',
    data
  }

  await mongo.db.collection('files').insertOne(files)

  const {validation} = await Revisions.computeRevision(revision)
  t.is(validation.valid, true)
  t.deepEqual(validation.errors, [])
  t.deepEqual(validation.warnings, [])
})

test.serial('computeRevision without relax mode', async t => {
  const client = {
    _id: new mongo.ObjectId(),
    active: true,
    name: 'Test'
  }

  await mongo.db.collection('clients').insertOne(client)

  const revision = {
    _id: new mongo.ObjectId(),
    client: client._id,
    codeCommune: '71346'
  }

  await mongo.db.collection('revisions').insertOne(revision)

  const data = await readFile(join(__dirname, 'fixtures', 'test-valid-relax.csv'))
  const files = {
    _id: new mongo.ObjectId(),
    revisionId: revision._id,
    type: 'bal',
    data
  }

  await mongo.db.collection('files').insertOne(files)

  const {validation} = await Revisions.computeRevision(revision)
  t.is(validation.valid, false)
  t.not(validation.errors.length, 0)
})

test.serial('computeRevision with relax mode false', async t => {
  const client = {
    _id: new mongo.ObjectId(),
    active: true,
    name: 'Test',
    options: {relaxMode: false}
  }

  await mongo.db.collection('clients').insertOne(client)

  const revision = {
    _id: new mongo.ObjectId(),
    client: client._id,
    codeCommune: '71346'
  }

  await mongo.db.collection('revisions').insertOne(revision)

  const data = await readFile(join(__dirname, 'fixtures', 'test-valid-relax.csv'))
  const files = {
    _id: new mongo.ObjectId(),
    revisionId: revision._id,
    type: 'bal',
    data
  }

  await mongo.db.collection('files').insertOne(files)

  const {validation} = await Revisions.computeRevision(revision)
  t.is(validation.valid, false)
  t.not(validation.errors.length, 0)
})

test.serial('getAllRevisionsByCommune / valid', async t => {
  const codeCommune = '00000'

  const revisions = [
    {
      _id: new mongo.ObjectId(),
      codeCommune,
      status: 'published'
    },
    {
      _id: new mongo.ObjectId(),
      codeCommune,
      status: 'pending'
    },
    {
      _id: new mongo.ObjectId(),
      codeCommune: '10000',
      status: 'published'
    }
  ]

  await mongo.db.collection('revisions').insertMany(revisions)
  const res = await Revisions.getAllRevisionsByCommune(codeCommune)
  t.is(res.length, 2)
})
