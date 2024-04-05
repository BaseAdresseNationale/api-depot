process.env.ADMIN_TOKEN = 'xxxxxxxxxxxxxxx'
require('dotenv').config()
const test = require('ava')
const express = require('express')
const request = require('supertest')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const {habilitationsRoutes} = require('../routes')

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
  await mongo.db.collection('habilitations').deleteMany({})
  await mongo.db.collection('clients').deleteMany({})
})

async function getApp(params) {
  const app = express()
  const routes = await habilitationsRoutes(params)
  app.use(routes)

  return app
}

test.serial('fetch habilitation', async t => {
  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({
    _id: mandataireId,
    nom: 'mandataire'
  })

  const clientId = new mongo.ObjectId()
  await mongo.db.collection('clients').insertOne({
    _id: clientId,
    mandataire: mandataireId,
    nom: 'ACME 1',
    token: 'foobar',
    active: true
  })

  const _id = new mongo.ObjectId()
  await mongo.db.collection('habilitations').insertOne({
    _id,
    codeCommune: '27115',
    client: clientId
  })

  const server = await getApp()
  const res = await request(server)
    .get(`/habilitations/${_id}`)
    .set('Authorization', 'Token foobar')
    .expect(200)

  t.is(res.body.codeCommune, '27115')
})

test.serial('basic habilitation', async t => {
  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({
    _id: mandataireId,
    nom: 'mandataire'
  })

  await mongo.db.collection('clients').insertOne({
    _id: new mongo.ObjectId(),
    mandataire: mandataireId,
    nom: 'ACME 2',
    token: 'foobar',
    active: true
  })

  const server = await getApp()
  const res1 = await request(server)
    .post('/communes/27115/habilitations')
    .set('Authorization', 'Token foobar')
    .set('Content-Type', 'application/json')
    .expect(201)

  const habilitationId = res1.body._id

  t.is(res1.body.codeCommune, '27115')
  t.is(res1.body.emailCommune, 'mairie@breux-sur-avre.fr')
  t.is(res1.body.status, 'pending')

  await request(server)
    .post(`/habilitations/${habilitationId}/authentication/email/send-pin-code`)
    .set('Authorization', 'Token foobar')
    .expect(200)

  const habilitation = await mongo.db.collection('habilitations').findOne({_id: new mongo.ObjectId(habilitationId)})
  t.is(habilitation.status, 'pending')
  t.is(habilitation.strategy.type, 'email')
  t.truthy(habilitation.strategy.pinCode)
  t.truthy(habilitation.strategy.pinCodeExpiration)
  t.is(habilitation.strategy.remainingAttempts, 10)

  const res2 = await request(server)
    .post(`/habilitations/${habilitationId}/authentication/email/validate-pin-code`)
    .set('Authorization', 'Token foobar')
    .send({code: habilitation.strategy.pinCode})
    .expect(200)

  t.is(res2.body.status, 'accepted')
})

test.serial('habilitation / validate without token', async t => {
  await mongo.db.collection('clients').insertOne({
    _id: new mongo.ObjectId(),
    nom: 'ACME 2',
    token: 'foobar',
    active: true
  })

  const server = await getApp()
  const res1 = await request(server)
    .post('/communes/27115/habilitations')
    .set('Authorization', 'Token foobar')
    .set('Content-Type', 'application/json')
    .expect(201)

  const habilitationId = res1.body._id

  t.is(res1.body.codeCommune, '27115')
  t.is(res1.body.emailCommune, 'mairie@breux-sur-avre.fr')
  t.is(res1.body.status, 'pending')
  await request(server)
    .put(`/habilitations/${habilitationId}/validate`)
    .set('Authorization', 'Token foobar')
    .set('Content-Type', 'application/json')
    .expect(401)
})

test.serial('habilitation / validate', async t => {
  await mongo.db.collection('clients').insertOne({
    _id: new mongo.ObjectId(),
    nom: 'ACME 2',
    token: 'foobar',
    active: true
  })

  const server = await getApp()
  const res1 = await request(server)
    .post('/communes/27115/habilitations')
    .set('Authorization', 'Token foobar')
    .set('Content-Type', 'application/json')
    .expect(201)

  const habilitationId = res1.body._id

  t.is(res1.body.codeCommune, '27115')
  t.is(res1.body.emailCommune, 'mairie@breux-sur-avre.fr')
  t.is(res1.body.status, 'pending')
  const res = await request(server)
    .put(`/habilitations/${habilitationId}/validate`)
    .set('Authorization', `Token ${process.env.ADMIN_TOKEN}`)
    .set('Content-Type', 'application/json')
    .expect(200)

  t.is(res.body.status, 'accepted')
  t.is(res.body.strategy.type, 'internal')
})
