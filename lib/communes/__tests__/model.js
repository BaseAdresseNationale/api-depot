const test = require('ava')
const {add} = require('date-fns')
const {MongoMemoryServer} = require('mongodb-memory-server')
const mongo = require('../../util/mongo')
const Communes = require('../model')

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
  await mongo.db.collection('communes').deleteMany({})
})

test.serial('lock / Verrouille une commune avec succès', async t => {
  const code = '123'

  await Communes.lockPublishing(code)

  // Vérifie que la commune a été verrouillée
  const lockedCommune = await mongo.db.collection('communes').findOne({code})
  t.true(lockedCommune.publishing)
  t.truthy(lockedCommune.publishingSince)
})

test.serial('lock / Échoue lorsqu’une commune est déjà verrouillée', async t => {
  const code = '123'
  await mongo.db.collection('communes').insertOne({
    code,
    publishing: true,
    publishingSince: new Date()
  })

  // Tente de verrouiller une commune déjà verrouillée
  await t.throwsAsync(async () => {
    await Communes.lockPublishing(code)
  }, {message: 'Une publication est déjà en cours'})
})

test.serial('unlock / Déverrouille une commune avec succès', async t => {
  const code = '123'
  // Créer une commune verrouillée pour les tests
  await mongo.db.collection('communes').insertOne({
    code,
    publishing: true,
    publishingSince: new Date()
  })

  await Communes.unlockPublishing(code)

  // Vérifie que la commune a été déverrouillée
  const unlockedCommune = await mongo.db.collection('communes').findOne({code})
  t.false(unlockedCommune.publishing)
  t.falsy(unlockedCommune.publishingSince)
})

test.serial('unlock / Déverrouille une commune déjà déverrouillée sans erreur', async t => {
  const code = '123'
  // Créer une commune déverrouillée pour les tests
  await mongo.db.collection('communes').insertOne({
    code,
    publishing: false,
    publishingSince: new Date()
  })

  await Communes.unlockPublishing(code)

  // Vérifie que la commune est toujours déverrouillée
  const unlockedCommune = await mongo.db.collection('communes').findOne({code})
  t.false(unlockedCommune.publishing)
  t.falsy(unlockedCommune.publishingSince)
})

test.serial('unlockAndCleanOverdueCommunes / Déverrouille uniquement les communes dont le verrou est actif depuis trop longtemps', async t => {
  const now = new Date()
  const overdue = add(now, {minutes: 5})
  const lockedCommunes = [
    {code: '123', publishing: true, publishingSince: now},
    {code: '456', publishing: true, publishingSince: overdue}
  ]

  // Insérer les communes verrouillées dans la base de données en mémoire
  await mongo.db.collection('communes').insertMany(lockedCommunes)

  // Exécuter la fonction
  await Communes.unlockAndCleanOverdueCommunes()

  // Vérifie que la commune a bien toujours verrouillée
  const lockedCommune = await mongo.db.collection('communes').findOne({code: '123'})
  t.true(lockedCommune.publishing)
  t.truthy(lockedCommune.publishingSince)

  // Vérifie que la commune a bien été déverrouillée
  const unlockedCommune = await mongo.db.collection('communes').findOne({code: '456'})
  t.false(unlockedCommune.publishing)
  t.falsy(unlockedCommune.publishingSince)
})
