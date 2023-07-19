require('dotenv').config()

process.env.ADMIN_TOKEN = 'xxxxxxxxxxxxxxx'

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
  await mongo.db.collection('clients').deleteMany({})
  await mongo.db.collection('revisions').deleteMany({})
})

async function getApp(params) {
  const app = express()
  const routes = await revisionsRoutes(params)
  app.use(routes)

  return app
}

test.serial('publish revision / without habilitation', async t => {
  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({
    _id: mandataireId,
    nom: 'ACME'
  })

  const clientId = new mongo.ObjectId()
  await mongo.db.collection('clients').insertOne({
    _id: clientId,
    mandataire: mandataireId,
    nom: 'ACME',
    token: 'foobar',
    active: true
  })

  const _id = new mongo.ObjectId()
  await mongo.db.collection('revisions').insertOne({
    _id,
    ready: true,
    status: 'pending',
    codeCommune: '27115',
    client: clientId
  })

  const server = await getApp()
  const res = await request(server)
    .post(`/revisions/${_id}/publish`)
    .set('Authorization', 'Token foobar')
    .expect(200)

  t.is(res.body.status, 'published')
  t.is(res.body.current, true)
})

test.serial('publish revision / client not active', async t => {
  const clientId = new mongo.ObjectId()
  await mongo.db.collection('clients').insertOne({
    _id: clientId,
    nom: 'ACME',
    token: 'foobar',
    active: false
  })

  const _id = new mongo.ObjectId()
  await mongo.db.collection('revisions').insertOne({
    _id,
    ready: true,
    status: 'pending',
    codeCommune: '27115',
    client: clientId
  })

  const server = await getApp()
  await request(server)
    .post(`/revisions/${_id}/publish`)
    .set('Authorization', 'Token foobar')
    .expect(403)

  t.pass()
})

test.serial('publish revision / with habilitation', async t => {
  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({
    _id: mandataireId,
    nom: 'ACME'
  })

  const clientId = new mongo.ObjectId()
  const client = {
    _id: clientId,
    nom: 'ACME',
    token: 'foobar',
    active: true,
    mandataire: mandataireId
  }
  await mongo.db.collection('clients').insertOne(client)

  const revisionId = new mongo.ObjectId()
  await mongo.db.collection('revisions').insertOne({
    _id: revisionId,
    ready: true,
    status: 'pending',
    codeCommune: '27115',
    client: clientId
  })

  const habilitationId = new mongo.ObjectId()
  await mongo.db.collection('habilitations').insertOne({
    _id: habilitationId,
    status: 'accepted',
    strategy: {
      type: 'email'
    },
    codeCommune: '27115',
    client: clientId
  })

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

test.serial('publish revision / consecutive', async t => {
  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({
    _id: mandataireId,
    nom: 'ACME'
  })

  const clientId = new mongo.ObjectId()
  const client = {
    _id: clientId,
    nom: 'ACME',
    token: 'foobar',
    active: true,
    mandataire: mandataireId
  }
  await mongo.db.collection('clients').insertOne(client)

  const revisionAId = new mongo.ObjectId()
  await mongo.db.collection('revisions').insertOne({
    _id: revisionAId,
    ready: true,
    status: 'pending',
    codeCommune: '27115',
    client: clientId
  })

  const habilitationId = new mongo.ObjectId()
  await mongo.db.collection('habilitations').insertOne({
    _id: habilitationId,
    status: 'accepted',
    strategy: {
      type: 'email'
    },
    codeCommune: '27115',
    client: clientId
  })

  const server = await getApp()
  const resA = await request(server)
    .post(`/revisions/${revisionAId}/publish`)
    .set('Authorization', 'Token foobar')
    .send({habilitationId})
    .expect(200)

  t.is(resA.body.status, 'published')
  t.is(resA.body.current, true)
  t.truthy(resA.body.habilitation)

  const revisionBId = new mongo.ObjectId()
  await mongo.db.collection('revisions').insertOne({
    _id: revisionBId,
    ready: true,
    status: 'pending',
    codeCommune: '27115',
    client: clientId
  })

  const resB = await request(server)
    .post(`/revisions/${revisionBId}/publish`)
    .set('Authorization', 'Token foobar')
    .send({habilitationId})
    .expect(200)

  t.is(resB.body.status, 'published')
  t.is(resB.body.current, true)
  t.truthy(resB.body.habilitation)
})

test.serial('Delete revision', async t => {
  const revisions = [
    {
      _id: new mongo.ObjectId(),
      codeCommune: '00000',
      current: true,
      status: 'published',
      publishedAt: new Date('01-03-2000').toISOString()

    },
    {
      _id: new mongo.ObjectId(),
      codeCommune: '00000',
      current: false,
      status: 'published',
      publishedAt: new Date('01-01-2000').toISOString()
    },
    {
      _id: new mongo.ObjectId(),
      codeCommune: '00000',
      current: false,
      status: 'published',
      publishedAt: new Date('01-02-2000').toISOString()
    }
  ]

  const files = [
    {
      _id: new mongo.ObjectId(),
      revisionId: revisions[0]._id
    },
    {
      _id: new mongo.ObjectId(),
      revisionId: revisions[0]._id
    }
  ]

  await mongo.db.collection('revisions').insertMany(revisions)
  await mongo.db.collection('file').insertMany(files)

  const server = await getApp()
  const res = await request(server)
    .delete(`/revisions/${revisions[0]._id}`)
    .set('Authorization', `Token ${process.env.ADMIN_TOKEN}`)
    .expect(200)

  // Check response
  t.is(res.body.current, true)
  t.is(res.body._id, revisions[2]._id.toHexString())
  // Check revision and file are deleted
  const resR1 = await mongo.db.collection('revisions').findOne({_id: revisions[0]._id})
  t.is(resR1, null)
  const resF1 = await mongo.db.collection('files').findOne({_id: files[0]._id})
  t.is(resF1, null)
  const resF2 = await mongo.db.collection('files').findOne({_id: files[1]._id})
  t.is(resF2, null)
  // Check other revision
  const resR2 = await mongo.db.collection('revisions').findOne({_id: revisions[1]._id})
  t.is(resR2.current, false)
  const resR3 = await mongo.db.collection('revisions').findOne({_id: revisions[2]._id})
  t.is(resR3.current, true)
})

test.serial('Delete revision 403', async t => {
  const revisions = [
    {
      _id: new mongo.ObjectId(),
      codeCommune: '00000',
      current: true,
      status: 'published',
      publishedAt: new Date('01-03-2000').toISOString()
    }
  ]

  const files = [
    {
      _id: new mongo.ObjectId(),
      revisionId: revisions[0]._id
    },
    {
      _id: new mongo.ObjectId(),
      revisionId: revisions[0]._id
    }
  ]

  await mongo.db.collection('revisions').insertMany(revisions)
  await mongo.db.collection('file').insertMany(files)

  const server = await getApp()
  await request(server)
    .delete(`/revisions/${revisions[0]._id}`)
    .set('Authorization', 'Token xxxx')
    .expect(401)

  t.pass()
})

test.serial('Delete revision only one current', async t => {
  const revisions = [
    {
      _id: new mongo.ObjectId(),
      codeCommune: '00000',
      current: true,
      status: 'published',
      publishedAt: new Date('01-03-2000').toISOString()
    }
  ]

  const files = [
    {
      _id: new mongo.ObjectId(),
      revisionId: revisions[0]._id
    },
    {
      _id: new mongo.ObjectId(),
      revisionId: revisions[0]._id
    }
  ]

  await mongo.db.collection('revisions').insertMany(revisions)
  await mongo.db.collection('file').insertMany(files)

  const server = await getApp()
  await request(server)
    .delete(`/revisions/${revisions[0]._id}`)
    .set('Authorization', `Token ${process.env.ADMIN_TOKEN}`)
    .expect(500)

  t.pass()
})

test.serial('Delete revision not current', async t => {
  const revisions = [
    {
      _id: new mongo.ObjectId(),
      codeCommune: '00000',
      current: true,
      status: 'published',
      publishedAt: new Date('01-03-2000').toISOString()

    },
    {
      _id: new mongo.ObjectId(),
      codeCommune: '00000',
      current: false,
      status: 'published',
      publishedAt: new Date('01-01-2000').toISOString()
    }
  ]

  const files = [
    {
      _id: new mongo.ObjectId(),
      revisionId: revisions[0]._id
    },
    {
      _id: new mongo.ObjectId(),
      revisionId: revisions[0]._id
    }
  ]

  await mongo.db.collection('revisions').insertMany(revisions)
  await mongo.db.collection('file').insertMany(files)

  const server = await getApp()
  await request(server)
    .delete(`/revisions/${revisions[1]._id}`)
    .set('Authorization', `Token ${process.env.ADMIN_TOKEN}`)
    .expect(400)

  t.pass()
})
