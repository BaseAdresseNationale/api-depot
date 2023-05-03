const express = require('express')
const createError = require('http-errors')
const errorHandler = require('../util/error-handler')
const {ensureIsAdmin} = require('../util/middlewares')
const w = require('../util/w')
const Client = require('./model')

async function clientsRoutes() {
  const app = new express.Router()

  app.use(express.json())

  app.param('clientId', w(async (req, res, next) => {
    const {clientId} = req.params
    const client = await Client.fetch(clientId)

    if (!client) {
      throw createError(404, 'L’identifiant de client demandé n’existe pas')
    }

    req.client = client
    next()
  }))

  app.route('/clients/:clientId')
    .get(ensureIsAdmin, w(async (req, res) => {
      res.send(req.client)
    }))
    .put(ensureIsAdmin, w(async (req, res) => {
      const client = await Client.update(req.client._id, req.body)
      res.send(Client.filterSensitiveFields(client))
    }))

  app.route('/clients')
    .get(ensureIsAdmin, w(async (req, res) => {
      const clients = await Client.fetchAll()
      res.send(clients.map(client => Client.filterSensitiveFields(client)))
    }))
    .post(ensureIsAdmin, w(async (req, res) => {
      const client = await Client.create(req.body)
      res.status(201).send(client)
    }))

  app.post('/clients/:clientId/token/renew', ensureIsAdmin, w(async (req, res) => {
    const client = await Client.renewToken(req.client._id)
    res.send(Client.filterSensitiveFields(client))
  }))

  app.use(errorHandler)

  return app
}

module.exports = {clientsRoutes}
