const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const Client = require('../model')

let mongod

const keys = ['_id', 'nom', 'organisme', 'email', 'token']

test.before('start server', async () => {
  mongod = await MongoMemoryServer.create()
  await mongo.connect(mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test('create an client', async t => {
  const client = await Client.createClient({
    nom: 'Client Name',
    organisme: 'ACME SARL',
    email: 'iadresses@acme.ltd'
  })

  t.true(keys.every(k => k in client))
  t.is(Object.keys(client).length, 5)
  t.is(client.token.length, 32)
})

test('fetch an client', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('clients').insertOne({
    _id,
    nom: 'Client Name',
    organisme: 'ACME SARL',
    email: 'iadresses@acme.ltd',
    token: 'xxxxxxxxxxxxxxxxxxxx'
  })

  const client = await Client.fetchClient(_id)

  t.true(keys.every(k => k in client))
  t.is(Object.keys(client).length, 5)
})
