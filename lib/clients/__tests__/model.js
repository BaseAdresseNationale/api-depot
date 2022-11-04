const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const Client = require('../model')

let mongod

const keys = ['_id', 'mandataire', 'chefDeFile', 'nom', 'email', 'token', 'active', 'authorizationStrategy', 'options', '_updatedAt', '_createdAt']
const keysMinimal = ['_id', 'mandataire', 'nom', 'email', 'token', 'active', 'authorizationStrategy', 'options', '_updatedAt', '_createdAt']

test.serial.before('start server', async () => {
  mongod = await MongoMemoryServer.create()
  await mongo.connect(mongod.getUri())
})

test.serial.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test.serial.afterEach.always(async () => {
  await mongo.db.collection('clients').deleteMany({})
  await mongo.db.collection('mandataires').deleteMany({})
  await mongo.db.collection('chefs-de-file').deleteMany({})
})

test.serial('create client', async t => {
  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({_id: mandataireId, nom: 'mandataire'})

  const chefDeFileId = new mongo.ObjectId()
  await mongo.db.collection('chefs_de_file').insertOne({_id: chefDeFileId, nom: 'chef-de-file'})

  const client = await Client.create({
    nom: 'Client Name',
    email: 'iadresses@acme.ltd',
    active: true,
    options: {relaxMode: true, notAnOption: 'foo'},
    mandataire: mandataireId.toString(),
    chefDeFile: chefDeFileId.toString()
  })

  t.true(keys.every(k => k in client))
  t.is(Object.keys(client).length, 11)
  t.deepEqual(client.mandataire, mandataireId)
  t.deepEqual(client.chefDeFile, chefDeFileId)
  t.is(client.active, true)
  t.deepEqual(client.options, {relaxMode: true})
  t.is(client.authorizationStrategy, 'chef-de-file')
  t.is(client.token.length, 32)
})

test.serial('create client / minimal', async t => {
  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({_id: mandataireId, nom: 'mandataire'})

  const client = await Client.create({
    nom: 'Client Name',
    email: 'iadresses@acme.ltd',
    mandataire: mandataireId.toString()
  })

  t.true(keysMinimal.every(k => k in client))
  t.is(Object.keys(client).length, 10)
  t.deepEqual(client.mandataire, mandataireId)
  t.is(client.active, false)
  t.deepEqual(client.options, {relaxMode: false})
  t.is(client.authorizationStrategy, 'habilitation')
})

test.serial('update client', async t => {
  const now = new Date()

  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({
    _id: mandataireId,
    nom: 'mandataire',
    _createdAt: now,
    _updatedAt: now
  })

  const chefDeFileId = new mongo.ObjectId()
  await mongo.db.collection('chefs_de_file').insertOne({
    _id: chefDeFileId,
    nom: 'chef-de-file',
    _createdAt: now,
    _updatedAt: now
  })

  const _id = new mongo.ObjectId()
  await mongo.db.collection('clients').insertOne({
    _id,
    mandataire: mandataireId,
    chefDeFile: chefDeFileId,
    nom: 'Client Name',
    email: 'iadresses@acme.ltd',
    active: false,
    options: {relaxMode: true},
    _createdAt: now,
    _updatedAt: now
  })

  const client = await Client.update(_id, {
    active: true,
    options: {relaxMode: false}
  })

  const mandataire = await mongo.db.collection('mandataires').findOne({_id: mandataireId})
  const chefDeFile = await mongo.db.collection('chefs_de_file').findOne({_id: chefDeFileId})

  t.is(client.active, true)
  t.is(client.options.relaxMode, false)
  t.deepEqual(client._createdAt, now)
  t.notDeepEqual(client._updatedAt, now)
  t.notDeepEqual(mandataire._updatedAt, now)
  t.deepEqual(chefDeFile._updatedAt, now)
})

test.serial('update client / extra param', async t => {
  const now = new Date()

  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({
    _id: mandataireId,
    nom: 'mandataire',
    _createdAt: now,
    _updatedAt: now
  })

  const chefDeFileId = new mongo.ObjectId()
  await mongo.db.collection('chefs_de_file').insertOne({
    _id: chefDeFileId,
    nom: 'chef-de-file',
    _createdAt: now,
    _updatedAt: now
  })

  const _id = new mongo.ObjectId()
  await mongo.db.collection('clients').insertOne({
    _id,
    mandataire: mandataireId,
    chefDeFile: chefDeFileId,
    nom: 'Client Name',
    email: 'iadresses@acme.ltd',
    active: false,
    options: {relaxMode: true},
    _createdAt: now,
    _updatedAt: now
  })

  const client = await Client.update(_id, {foo: 'bar'})

  const mandataire = await mongo.db.collection('mandataires').findOne({_id: mandataireId})
  const chefDeFile = await mongo.db.collection('chefs_de_file').findOne({_id: chefDeFileId})

  t.deepEqual(client._createdAt, now)
  t.deepEqual(client._updatedAt, now)
  t.falsy(client.foo)
  t.deepEqual(mandataire._updatedAt, now)
  t.deepEqual(chefDeFile._updatedAt, now)
})

test.serial('fetch client', async t => {
  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({_id: mandataireId, nom: 'mandataire'})

  const chefDeFileId = new mongo.ObjectId()
  await mongo.db.collection('chefs_de_file').insertOne({_id: chefDeFileId, nom: 'chef-de-file'})

  const now = new Date()
  const _id = new mongo.ObjectId()
  await mongo.db.collection('clients').insertOne({
    _id,
    mandataire: mandataireId,
    chefDeFile: chefDeFileId,
    nom: 'Client Name',
    token: 'xxxxxxxxxx',
    email: 'iadresses@acme.ltd',
    authorizationStrategy: 'chef-de-file',
    active: false,
    _createdAt: now,
    _updatedAt: now,
    options: {relaxMode: true}
  })

  const client = await Client.fetch(_id)

  t.true(keys.every(k => k in client))
  t.is(Object.keys(client).length, 11)
})
