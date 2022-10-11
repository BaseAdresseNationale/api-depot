require('dotenv').config()

process.env.ADMIN_TOKEN = 'xxxxxxxxxxxxxxx'

const test = require('ava')
const express = require('express')
const request = require('supertest')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const {clientsRoutes} = require('../routes')

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
  await mongo.db.collection('clients').deleteMany({})
})

async function getApp(params) {
  const app = express()
  const routes = await clientsRoutes(params)
  app.use(routes)

  return app
}

test.serial('fetch client', async t => {
  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({_id: mandataireId, nom: 'mandataire'})

  const chefDeFileId = new mongo.ObjectId()
  await mongo.db.collection('chefs_de_file').insertOne({_id: chefDeFileId, nom: 'chef-de-file'})

  const _id = new mongo.ObjectId()
  const client = {
    _id,
    mandataire: mandataireId.toString(),
    chefDeFile: chefDeFileId.toString(),
    nom: 'Client Name',
    email: 'iadresses@acme.ltd',
    active: true,
    options: {relaxMode: true}
  }
  await mongo.db.collection('clients').insertOne(client)

  const server = await getApp()
  const res = await request(server)
    .get(`/clients/${_id}`)
    .set('Authorization', `Token ${process.env.ADMIN_TOKEN}`)
    .expect(200)

  t.is(res.body.nom, 'Client Name')
  t.is(res.body.mandataire, mandataireId.toString())
  t.is(res.body.chefDeFile, chefDeFileId.toString())
  t.is(res.body.email, 'iadresses@acme.ltd')
  t.deepEqual(res.body.options, {relaxMode: true})
  t.falsy(res.body.token)
})

test.serial('fetch client / not admin', async t => {
  const _id = new mongo.ObjectId()
  const client = {_id}
  await mongo.db.collection('clients').insertOne(client)

  const server = await getApp()
  const res = await request(server)
    .get(`/clients/${_id}`)
    .expect(401)

  t.deepEqual(res.body, {})
})

test.serial('create client', async t => {
  const server = await getApp()

  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({_id: mandataireId, nom: 'mandataire'})

  const res = await request(server)
    .post('/clients')
    .set('Content-Type', 'application/json')
    .set('Authorization', `Token ${process.env.ADMIN_TOKEN}`)
    .send({
      nom: 'ACME',
      mandataire: mandataireId.toString(),
      email: 'me@domain.co'
    })
    .expect(201)

  t.is(res.body.nom, 'ACME')
  t.is(res.body.email, 'me@domain.co')
  t.is(res.body.mandataire, mandataireId.toString())
  t.truthy(res.body.token)
})

test.serial('create client / not admin', async t => {
  const server = await getApp()

  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({_id: mandataireId, nom: 'mandataire'})

  await request(server)
    .post('/clients')
    .set('Content-Type', 'application/json')
    .send({
      nom: 'ACME',
      mandataire: mandataireId.toString(),
      email: 'me@domain.co'
    })
    .expect(401)

  const clients = await mongo.db.collection('clients').find().toArray()
  t.is(clients.length, 0)
})

test.serial('update client', async t => {
  const server = await getApp()

  const now = new Date()
  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({_id: mandataireId, nom: 'mandataire'})

  const chefDeFileId = new mongo.ObjectId()
  await mongo.db.collection('chefs_de_file').insertOne({_id: chefDeFileId, nom: 'chef-de-file'})

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

  const res = await request(server)
    .put(`/clients/${_id}`)
    .set('Content-Type', 'application/json')
    .set('Authorization', `Token ${process.env.ADMIN_TOKEN}`)
    .send({
      nom: 'ACME',
      email: 'me@domain.co',
      active: true
    })
    .expect(200)

  t.falsy(res.body.token)
})

test.serial('update client / extra param', async t => {
  const server = await getApp()

  const now = new Date()
  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({_id: mandataireId, nom: 'mandataire'})

  const chefDeFileId = new mongo.ObjectId()
  await mongo.db.collection('chefs_de_file').insertOne({_id: chefDeFileId, nom: 'chef-de-file'})

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

  const res = await request(server)
    .put(`/clients/${_id}`)
    .set('Content-Type', 'application/json')
    .set('Authorization', `Token ${process.env.ADMIN_TOKEN}`)
    .send({foo: 'bar'})
    .expect(304)

  t.falsy(res.body.foo)
})

test.serial('update client / not admin', async t => {
  const server = await getApp()

  const now = new Date()
  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({_id: mandataireId, nom: 'mandataire'})

  const chefDeFileId = new mongo.ObjectId()
  await mongo.db.collection('chefs_de_file').insertOne({_id: chefDeFileId, nom: 'chef-de-file'})

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

  await request(server)
    .put(`/clients/${_id}`)
    .set('Content-Type', 'application/json')
    .send({nom: 'ACME'})
    .expect(401)

  const client = await mongo.db.collection('clients').findOne({_id})
  t.is(client.nom, 'Client Name')
})
