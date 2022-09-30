const createError = require('http-errors')
const mongo = require('../util/mongo')

function generateToken() {
  const length = 32
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let retVal = ''
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n))
  }

  return retVal
}

async function createClient({nom, organisme, email}) {
  const _id = new mongo.ObjectId()
  const token = generateToken()

  const client = {
    _id,
    nom,
    organisme,
    email,
    token
  }

  await mongo.db.collection('clients').insertOne(client)

  return client
}

function fetchClient(clientId) {
  try {
    clientId = new mongo.ObjectId(clientId)
  } catch {
    throw createError(404, 'L’identifiant de client est invalide')
  }

  return mongo.db.collection('clients').findOne({_id: clientId})
}

module.exports = {
  createClient,
  fetchClient
}
