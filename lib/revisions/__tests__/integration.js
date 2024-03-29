const {join} = require('path')
const {readFile} = require('fs').promises
const test = require('ava')
const express = require('express')
const request = require('supertest')
const {MongoMemoryServer} = require('mongodb-memory-server')
const sinon = require('sinon')
const proxyquire = require('proxyquire')
const mongo = require('../../util/mongo')
const {filterSensitiveFields} = require('../../clients/model')

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
  await mongo.db.collection('files').deleteMany({})
})

// We need to stub the S3 service for the tests
async function getRevisionRoutesForTests() {
  const balFile = await readFile(join(__dirname, 'fixtures', 'bal-valid.csv'))

  const ModelModuleWithStubbedS3Dependancy = proxyquire('../model', {
    '../files/s3.service': {
      s3Service: {
        uploadS3File: sinon.stub().returns(Promise.resolve()),
        checkS3FileExists: sinon.stub().returns(Promise.resolve(true)),
        getS3File: sinon.stub().returns(Promise.resolve(Buffer.from(balFile)))
      }
    }
  })

  const {revisionsRoutes} = proxyquire('../routes', {
    './model': ModelModuleWithStubbedS3Dependancy
  })

  return revisionsRoutes
}

async function getApp(params) {
  const app = express()
  const revisionsRoutesForTests = await getRevisionRoutesForTests()
  const routes = await revisionsRoutesForTests(params)
  app.use(routes)

  return app
}

test.serial('authentication / success', async t => {
  const server = await getApp()

  const client = {
    _id: new mongo.ObjectId(),
    id: 'legacy-id',
    nom: 'ACME',
    token: 'foobar',
    options: {
      relaxMode: false
    },
    active: true
  }
  await mongo.db.collection('clients').insertOne(client)
  const res = await request(server)
    .get('/me')
    .set('Authorization', 'Token foobar')
    .expect(200)

  const unsensitiveClient = filterSensitiveFields(client)
  t.true(Object.keys(unsensitiveClient).every(k => k in res.body))
  t.is(Object.keys(res.body).length, 5)
})

test.serial('authentication / Unauthorized', async t => {
  const server = await getApp()

  const clientId = new mongo.ObjectId()
  const client = {
    _id: clientId,
    nom: 'ACME',
    token: 'foobar',
    active: true
  }
  await mongo.db.collection('clients').insertOne(client)

  await request(server)
    .get('/me')
    .set('Authorization', 'Token ohnooo')
    .expect(401)

  t.pass()
})

test.serial('authentication / Forbidden', async t => {
  const server = await getApp()

  await mongo.db.collection('clients').insertOne({
    _id: new mongo.ObjectId(),
    nom: 'ACME',
    token: 'foobar',
    active: false
  })

  await request(server)
    .get('/me')
    .set('Authorization', 'Token foobar')
    .expect(403)

  t.pass()
})

test.serial('basic revision', async t => {
  const server = await getApp()

  const mandataireId = new mongo.ObjectId()
  await mongo.db.collection('mandataires').insertOne({
    _id: mandataireId,
    nom: 'mandataire'
  })

  await mongo.db.collection('clients').insertOne({
    _id: new mongo.ObjectId(),
    id: 'id-client',
    mandataire: mandataireId,
    nom: 'ACME',
    token: 'foobar',
    active: true
  })

  const res1 = await request(server)
    .post('/communes/31591/revisions')
    .set('Authorization', 'Token foobar')
    .set('Content-Type', 'application/json')
    .send(JSON.stringify({context: {organisation: 'ACME'}}))
    .expect(201)

  t.is(res1.body.context.organisation, 'ACME')
  t.is(res1.body.status, 'pending')
  t.is(res1.body.ready, false)
  t.is(res1.body.codeCommune, '31591')

  const revisionId = res1.body._id

  const balFile = await readFile(join(__dirname, 'fixtures', 'bal-valid.csv'))

  const res2 = await request(server)
    .put(`/revisions/${revisionId}/files/bal`)
    .set('Authorization', 'Token foobar')
    .set('Content-Type', 'text/csv')
    .set('Content-Disposition', 'attachment; filename=31591.csv')
    .send(balFile)
    .expect(200)

  t.is(res2.body.size, 793)
  t.is(res2.body.name, '31591.csv')
  t.is(res2.body.type, 'bal')
  t.is(res2.body.hash, '8e67eef2db54dc96c3165060e4dc3b5239fcf82f7e61e3d72e72dfdf9ae2b16c')
  t.is(res2.body.revisionId, revisionId)

  const res3 = await request(server)
    .post(`/revisions/${revisionId}/compute`)
    .set('Authorization', 'Token foobar')
    .expect(200)

  t.is(res3.body.validation.valid, true)
  t.is(res3.body.ready, true)

  const res4 = await request(server)
    .post(`/revisions/${revisionId}/publish`)
    .set('Authorization', 'Token foobar')
    .expect(200)

  t.is(res4.body.status, 'published')
  t.is(res4.body.current, true)

  const res5 = await request(server)
    .get('/communes/31591/current-revision/files/bal/download')
    .expect('Content-Type', 'text/csv')
    .expect('Content-Disposition', 'attachment; filename="31591.csv"')
    .expect(200)

  t.is(res5.text, balFile.toString())

  const res6 = await request(server)
    .get('/communes/31591/current-revision')
    .expect(200)

  t.is(res6.body._id, revisionId)
  t.truthy(res6.body.client._id)
  t.is(res6.body.client.id, 'id-client')
  t.is(res6.body.client.nom, 'ACME')

  const res7 = await request(server)
    .get('/communes/31591/revisions')
    .expect(200)

  t.is(res7.body.length, 1)
  t.is(res7.body[0]._id, revisionId)
})
