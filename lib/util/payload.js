const createHttpError = require('http-errors')
const {pick} = require('lodash')
const mongo = require('./mongo')

function validObjectID(id) {
  if (id) {
    const objectID = mongo.ObjectId.createFromHexString(id)
    if (mongo.ObjectId.isValid(id)) {
      return objectID
    }

    throw new Error('ObjectId is invalid')
  }
}

function getFilteredPayload(payload, schema) {
  const acceptableKeys = Object.keys(schema.describe().keys)
  return pick(payload, acceptableKeys)
}

function validPayload(payload, schema) {
  const {error, value} = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
    convert: false
  })

  if (error) {
    throw createHttpError(400, error)
  }

  return value
}

module.exports = {
  getFilteredPayload,
  validPayload,
  validObjectID
}
