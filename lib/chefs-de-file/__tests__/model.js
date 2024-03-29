const test = require('ava')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const ChefDeFile = require('../model')

let mongod

const keys = ['_id', 'nom', 'email', 'perimetre', 'signataireCharte', '_createdAt', '_updatedAt']

test.before('start server', async () => {
  mongod = await MongoMemoryServer.create()
  await mongo.connect(mongod.getUri())
})

test.after.always('cleanup', async () => {
  await mongo.disconnect()
  await mongod.stop()
})

test.afterEach.always(async () => {
  await mongo.db.collection('chefs_de_file').deleteMany({})
})

test.serial('create chefDeFile', async t => {
  const chefDeFile = await ChefDeFile.create({
    nom: 'ACME',
    email: 'iadresses@acme.ltd',
    isEmailPublic: true,
    perimetre: [{type: 'epci', code: '246800726'}],
    signataireCharte: true
  })

  t.true(keys.every(k => k in chefDeFile))
  t.is(Object.keys(chefDeFile).length, 8)
  t.is(chefDeFile.nom, 'ACME')
  t.is(chefDeFile.email, 'iadresses@acme.ltd')
  t.is(chefDeFile.isEmailPublic, true)
  t.deepEqual(chefDeFile.perimetre, [{type: 'epci', code: '246800726'}])
  t.is(chefDeFile.signataireCharte, true)
})

test.serial('create chefDeFile / minimal', async t => {
  const chefDeFile = await ChefDeFile.create({
    nom: 'ACME',
    email: 'iadresses@acme.ltd',
    isEmailPublic: false,
    perimetre: [{type: 'commune', code: '27115'}]
  })

  t.true(keys.every(k => k in chefDeFile))
  t.is(Object.keys(chefDeFile).length, 8)
  t.is(chefDeFile.nom, 'ACME')
  t.is(chefDeFile.isEmailPublic, false)
  t.is(chefDeFile.email, 'iadresses@acme.ltd')
  t.deepEqual(chefDeFile.perimetre, [{type: 'commune', code: '27115'}])
  t.is(chefDeFile.signataireCharte, false)
})

test.serial('create chefDeFile / invalid perimetre', async t => {
  const chefDeFile = {
    nom: 'ACME',
    email: 'iadresses@acme.ltd',
    perimetre: ['27115']
  }

  await t.throwsAsync(() => ChefDeFile.create(chefDeFile))
})

test.serial('update chefDeFile', async t => {
  const now = new Date()
  const _id = new mongo.ObjectId()

  await mongo.db.collection('chefs_de_file').insertOne({
    _id,
    nom: 'ACME',
    email: 'iadresses@acme.ltd',
    perimetre: [{type: 'departement', code: '14'}],
    signataireCharte: false,
    _createdAt: now,
    _updatedAt: now
  })

  const chefDeFile = await ChefDeFile.update(_id, {
    nom: 'nouveau nom',
    email: 'nouveau@mail.fr',
    perimetre: [{type: 'departement', code: '27'}],
    signataireCharte: true
  })
  t.deepEqual(chefDeFile._id, _id)
  t.deepEqual(chefDeFile._createdAt, now)
  t.notDeepEqual(chefDeFile._updatedAt, now)
  t.is(chefDeFile.nom, 'nouveau nom')
  t.is(chefDeFile.email, 'nouveau@mail.fr')
  t.deepEqual(chefDeFile.perimetre, [{type: 'departement', code: '27'}])
  t.is(chefDeFile.signataireCharte, true)
})

test.serial('update chefDeFile / extra param', async t => {
  const now = new Date()
  const _id = new mongo.ObjectId()

  await mongo.db.collection('chefs_de_file').insertOne({
    _id,
    nom: 'ACME',
    email: 'iadresses@acme.ltd',
    perimetre: ['27115'],
    signataireCharte: false,
    _createdAt: now,
    _updatedAt: now
  })

  await t.throwsAsync(ChefDeFile.update(_id, {foo: 'bar'}))
})

