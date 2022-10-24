const express = require('express')
const createError = require('http-errors')
const {isEqual} = require('lodash')
const errorHandler = require('../util/error-handler')
const {ensureIsAdmin} = require('../util/middlewares')
const w = require('../util/w')
const Mandataire = require('./model')

async function mandatairesRoutes() {
  const app = new express.Router()

  app.use(express.json())

  app.param('mandataireId', w(async (req, res, next) => {
    const {mandataireId} = req.params
    const mandataire = await Mandataire.fetch(mandataireId)

    if (!mandataire) {
      throw createError(404, 'L’identifiant de mandataire demandé n’existe pas')
    }

    req.mandataire = mandataire
    next()
  }))

  app.route('/mandataires/:mandataireId')
    .get(ensureIsAdmin, w(async (req, res) => {
      res.send(req.mandataire)
    }))
    .put(ensureIsAdmin, w(async (req, res) => {
      const mandataire = await Mandataire.update(req.mandataire._id, req.body)

      if (isEqual(req.mandataire, mandataire)) {
        return res.sendStatus(304)
      }

      res.send(mandataire)
    }))

  app.route('/mandataires')
    .get(ensureIsAdmin, w(async (req, res) => {
      const mandataires = await Mandataire.fetchAll()
      res.send(mandataires)
    }))
    .post(ensureIsAdmin, w(async (req, res) => {
      const mandataire = await Mandataire.create(req.body)
      res.status(201).send(mandataire)
    }))

  app.use(errorHandler)

  return app
}

module.exports = {mandatairesRoutes}
