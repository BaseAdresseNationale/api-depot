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
  const _id = new mongo.ObjectId()
  const client = {
    _id,
    nom: 'ACME',
    organisme: 'ACME SARL',
    email: 'me@domain.co',
    token: 'foobar'
  }
  await mongo.db.collection('clients').insertOne(client)

  const server = await getApp()
  const res = await request(server)
    .get(`/clients/${_id}`)
    .set('Authorization', `Token ${process.env.ADMIN_TOKEN}`)
    .expect(200)

  t.is(res.body.nom, 'ACME')
  t.is(res.body.organisme, 'ACME SARL')
  t.is(res.body.email, 'me@domain.co')
  t.is(res.body.token, 'foobar')
})

test.serial('fetch client / not admin', async t => {
  const _id = new mongo.ObjectId()
  const client = {
    _id,
    nom: 'ACME',
    token: 'foobar'
  }
  await mongo.db.collection('clients').insertOne(client)

  const server = await getApp()
  const res = await request(server)
    .get(`/clients/${_id}`)
    .expect(401)

  t.deepEqual(res.body, {})
})

test.serial('create client', async t => {
  const server = await getApp()
  const res = await request(server)
    .post('/clients')
    .set('Content-Type', 'application/json')
    .set('Authorization', `Token ${process.env.ADMIN_TOKEN}`)
    .send({
      nom: 'ACME',
      organisme: 'ACME SARL',
      email: 'me@domain.co'
    })
    .expect(201)

  t.is(res.body.nom, 'ACME')
  t.is(res.body.organisme, 'ACME SARL')
  t.is(res.body.email, 'me@domain.co')
  t.truthy(res.body.token)
})

test.serial('create client / not admin', async t => {
  const server = await getApp()
  await request(server)
    .post('/clients')
    .set('Content-Type', 'application/json')
    .send({
      nom: 'ACME',
      organisme: 'ACME SARL',
      email: 'me@domain.co'
    })
    .expect(401)

  const clients = await mongo.db.collection('clients').find().toArray()
  t.is(clients.length, 0)
})
