const test = require('ava')
const express = require('express')
const request = require('supertest')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const {revisionsRoutes} = require('../routes')

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

async function getApp(params) {
  const app = express()
  const routes = await revisionsRoutes(params)
  app.use(routes)

  return app
}

test.serial('publish revision / without habilitation', async t => {
  const _id = new mongo.ObjectId()
  await mongo.db.collection('revisions').insertOne({
    _id,
    ready: true,
    status: 'pending',
    codeCommune: '27115',
    client: {name: 'ACME'}
  })
  const clientId = new mongo.ObjectId()
  const client = {
    _id: clientId,
    name: 'ACME',
    token: 'foobar'
  }
  await mongo.db.collection('clients').insertOne(client)

  const server = await getApp()
  const res = await request(server)
    .post(`/revisions/${_id}/publish`)
    .set('Authorization', 'Token foobar')
    .expect(200)

  t.is(res.body.status, 'published')
  t.is(res.body.current, true)
})

test.serial('publish revision / with habilitation', async t => {
  const revisionId = new mongo.ObjectId()
  await mongo.db.collection('revisions').insertOne({
    _id: revisionId,
    ready: true,
    status: 'pending',
    codeCommune: '27115',
    client: {name: 'ACME'}
  })

  const habilitationId = new mongo.ObjectId()
  await mongo.db.collection('habilitations').insertOne({
    _id: habilitationId,
    status: 'accepted',
    strategy: {
      type: 'email'
    },
    codeCommune: '27115',
    client: {name: 'ACME'}
  })
  const clientId = new mongo.ObjectId()
  const client = {
    _id: clientId,
    name: 'ACME',
    token: 'foobar'
  }
  await mongo.db.collection('clients').insertOne(client)

  const server = await getApp()
  const res = await request(server)
    .post(`/revisions/${revisionId}/publish`)
    .set('Authorization', 'Token foobar')
    .send({habilitationId})
    .expect(200)

  t.is(res.body.status, 'published')
  t.is(res.body.current, true)
  t.truthy(res.body.habilitation)
})
