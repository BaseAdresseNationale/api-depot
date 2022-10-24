const createHttpError = require('http-errors')
const {pick, reduce} = require('lodash')
const mongo = require('./mongo')

class ValidationError extends Error {
  constructor(validationDetails) {
    super('Invalid payload')
    this.validation = reduce(validationDetails, (acc, detail) => {
      const key = detail.path[0]
      if (!acc[key]) {
        acc[key] = []
      }

      acc[key].push(detail.message)
      return acc
    }, {})
  }
}

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
    const validationError = new ValidationError(error.details)
    throw createHttpError(400, validationError)
  }

  return value
}

module.exports = {
  getFilteredPayload,
  validPayload,
  validObjectID,
  ValidationError
}
