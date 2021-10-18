const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const Habilitation = require('../model')

let mongod

test.before('start server', async () => {
  mongod = await MongoMemoryServer.create()
  await mongo.connect(mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test('create an habilitation', async t => {
  const habilitation = await Habilitation.createHabilitation({
    codeCommune: '27115',
    client: {}
  })

  const keys = ['_id', 'codeCommune', 'emailCommune', 'strategy', 'client', 'status', 'createdAt', 'updatedAt', 'expiresAt']

  t.true(keys.every(k => k in habilitation))
  t.is(habilitation.status, 'pending')
  t.is(Object.keys(habilitation).length, 9)
})

test('Ask for an habilitation', async t => {
  const now = new Date()
  const _id = new mongo.ObjectID()
  const habilitation = {_id, updatedAt: now, createAt: now, status: 'pending'}
  await mongo.db.collection('habilitations').insertOne(habilitation)

  const strategy = {
    pinCode: '000000',
    type: 'email',
    pinCodeExpiration: null,
    createAt: null,
    validatedAt: null
  }

  const pendingHabilitation = await Habilitation.askHabilitation(habilitation, strategy)
  t.is(pendingHabilitation.status, 'pending')
  t.not(pendingHabilitation.updatedAt, now)
  t.truthy(pendingHabilitation.strategy)
})

test('Validate habilitation', async t => {
  const now = new Date()
  const _id = new mongo.ObjectID()
  const habilitation = {
    _id,
    updatedAt: now,
    createAt: now,
    strategy: {pinCode: '000000', type: 'email'}
  }
  await mongo.db.collection('habilitations').insertOne(habilitation)

  const validatedHabilitation = await Habilitation.validateHabilitation(habilitation)
  t.is(validatedHabilitation.status, 'accepted')
  t.not(validatedHabilitation.updatedAt, now)
  t.truthy(validatedHabilitation.strategy)
  t.truthy(validatedHabilitation.expiresAt)
  t.truthy(validatedHabilitation.strategy.validatedAt)
})

test('Decrease remaining attempts', async t => {
  const now = new Date()
  const _id = new mongo.ObjectID()
  const habilitation = {
    _id,
    updatedAt: now,
    createAt: now,
    strategy: {pinCode: '000000', type: 'email', remainingAttempts: 5}
  }
  await mongo.db.collection('habilitations').insertOne(habilitation)

  const updatedHabilitation = await Habilitation.decreasesRemainingAttempts(habilitation._id)
  t.is(updatedHabilitation.strategy.remainingAttempts, 4)
})

test('Reject habilitation', async t => {
  const now = new Date()
  const _id = new mongo.ObjectID()
  const habilitation = {
    _id,
    updatedAt: now,
    createAt: now,
    strategy: {pinCode: '000000', type: 'email', remainingAttempts: 5}
  }
  await mongo.db.collection('habilitations').insertOne(habilitation)

  const rejectedHabilitation = await Habilitation.rejectHabilitation(habilitation._id)
  t.is(rejectedHabilitation.status, 'rejected')
})

test('Fetch habilitation', async t => {
  const now = new Date()
  const _id = new mongo.ObjectID()
  const habilitation = {
    _id,
    status: 'pending',
    updatedAt: now,
    createAt: now
  }
  await mongo.db.collection('habilitations').insertOne(habilitation)

  const fetchedHabilitation = await Habilitation.fetchHabilitation(habilitation._id)
  t.is(fetchedHabilitation.status, 'pending')
  t.deepEqual(fetchedHabilitation.updatedAt, now)
  t.deepEqual(fetchedHabilitation.createAt, now)
})
