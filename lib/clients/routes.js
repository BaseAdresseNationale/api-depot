const express = require('express')
const createError = require('http-errors')
const {ensureIsAdmin} = require('../util/middlewares')
const w = require('../util/w')
const {fetchClient, createClient} = require('./model')

async function clientsRoutes() {
  const app = new express.Router()

  app.use(express.json())

  app.param('clientId', w(async (req, res, next) => {
    const {clientId} = req.params
    const client = await fetchClient(clientId)

    if (!client) {
      throw createError(404, 'L’identifiant de client demandé n’existe pas')
    }

    req.client = client
    next()
  }))

  app.get('/clients/:clientId', ensureIsAdmin, w(async (req, res) => {
    res.send(req.client)
  }))

  app.post('/clients', ensureIsAdmin, w(async (req, res) => {
    if (!req.body.nom) {
      throw createError(400, 'Le contenu de la requête est invalide (nom absent)')
    }

    if (!req.body.organisme) {
      throw createError(400, 'Le contenu de la requête est invalide (organisme absent)')
    }

    if (!req.body.organisme) {
      throw createError(400, 'Le contenu de la requête est invalide (organisme absent)')
    }

    if (!req.body.email) {
      throw createError(400, 'Le contenu de la requête est invalide (email absent)')
    }

    const client = await createClient(req.body)

    res.status(201).send(client)
  }))

  return app
}

module.exports = {clientsRoutes}
