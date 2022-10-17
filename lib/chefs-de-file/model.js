const createError = require('http-errors')
const Joi = require('joi')
const mongo = require('../util/mongo')
const {validPayload} = require('../util/payload')
const {isEPCI, isDepartement, isCommune} = require('../util/cog')

function validPerimetre(perimetreConvention) {
  const [territoireType, code] = perimetreConvention.split('-')
  if (!['epci', 'departement', 'commune'].includes(territoireType)) {
    throw new Error('Le type du terrioire est invalide')
  }

  if (territoireType === 'commune' && !isCommune(code)) {
    throw new Error('Le code commune est invalide')
  }

  if (territoireType === 'departement' && !isDepartement(code)) {
    throw new Error('Le code département est invalide')
  }

  if (territoireType === 'epci' && !isEPCI(code)) {
    throw new Error('Le siren epci est invalide')
  }

  return perimetreConvention
}

const createSchema = Joi.object({
  nom: Joi.string().min(3).max(200).required(),
  email: Joi.string().email().required(),
  perimetreConvention: Joi.array().items(Joi.string().custom(validPerimetre)).min(1).required(),
  signataireCharte: Joi.boolean().default(false)
})

async function create(payload) {
  const chefDefile = validPayload(payload, createSchema)

  mongo.decorateCreation(chefDefile)

  await mongo.db.collection('chefs_de_file').insertOne(chefDefile)

  return chefDefile
}

const updateSchema = Joi.object({
  nom: Joi.string().min(3).max(200),
  email: Joi.string().email(),
  perimetreConvention: Joi.array().items(Joi.string().custom(validPerimetre)).min(1),
  signataireCharte: Joi.boolean()
})

async function update(id, payload) {
  const chefDefile = validPayload(payload, updateSchema)

  if (Object.keys(chefDefile).length === 0) {
    return mongo.db.collection('chefs_de_file').findOne({_id: id})
  }

  mongo.decorateModification(chefDefile)

  const {value} = await mongo.db.collection('chefs_de_file').findOneAndUpdate(
    {_id: mongo.parseObjectID(id)},
    {$set: chefDefile},
    {returnDocument: 'after'}
  )

  if (!value) {
    throw new Error('chef de file introuvable')
  }

  return value
}

function fetch(chefDeFileId) {
  try {
    chefDeFileId = new mongo.ObjectId(chefDeFileId)
  } catch {
    throw createError(404, 'L’identifiant du chef de file est invalide')
  }

  return mongo.db.collection('chefs_de_file').findOne({_id: chefDeFileId})
}

async function fetchAll() {
  return mongo.db.collection('chefs_de_file').find().toArray()
}

module.exports = {
  create,
  update,
  fetch,
  fetchAll
}
