const test = require('ava')
const express = require('express')
const request = require('supertest')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const {habilitationsRoutes} = require('../routes')

let mongod

const fakeClient = {
  name: 'ACME',
  token: 'foobar'
}

test.before('start server', async () => {
  mongod = await MongoMemoryServer.create()
  await mongo.connect(mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test.afterEach.always(async () => {
  await mongo.db.collection('habilitations').deleteMany({})
})

async function getApp(params) {
  const app = express()
  const routes = await habilitationsRoutes(params)
  app.use(routes)

  return app
}

test('fetch habilitation', async t => {
  const _id = new mongo.ObjectID()
  const habilitation = {_id, codeCommune: '27115'}
  await mongo.db.collection('habilitations').insertOne(habilitation)

  const server = await getApp({clients: [fakeClient]})
  const res = await request(server)
    .get(`/habilitations/${_id}`)
    .set('Authorization', 'Token foobar')
    .expect(200)

  t.is(res.body.codeCommune, '27115')
})

test('basic habilitation', async t => {
  const server = await getApp({clients: [fakeClient]})

  const res1 = await request(server)
    .post('/communes/27115/habilitations')
    .set('Authorization', 'Token foobar')
    .set('Content-Type', 'application/json')
    .expect(201)

  const habilitationId = res1.body._id

  t.is(res1.body.codeCommune, '27115')
  t.is(res1.body.emailCommune, 'mairie.breux.sur.avre@wanadoo.fr')
  t.is(res1.body.status, 'pending')

  await request(server)
    .post(`/habilitations/${habilitationId}/authentification/email/send-pin-code`)
    .set('Authorization', 'Token foobar')
    .expect(200)

  const habilitation = await mongo.db.collection('habilitations').findOne({_id: new mongo.ObjectID(habilitationId)})
  t.is(habilitation.status, 'pending')
  t.is(habilitation.strategy.type, 'email')
  t.truthy(habilitation.strategy.pinCode)
  t.truthy(habilitation.strategy.pinCodeExpiration)
  t.is(habilitation.strategy.remainingAttempts, 10)

  const res2 = await request(server)
    .post(`/habilitations/${habilitationId}/authentification/email/validate-pin-code`)
    .set('Authorization', 'Token foobar')
    .send({code: habilitation.strategy.pinCode})
    .expect(200)

  t.is(res2.body.status, 'accepted')
  t.truthy(res2.body.strategy.validatedAt)
})

