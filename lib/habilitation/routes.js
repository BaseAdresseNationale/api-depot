const express = require('express')
const {isString, isPlainObject} = require('lodash')
const createError = require('http-errors')
const errorHandler = require('../util/error-handler')
const {isCommuneActuelle} = require('../util/cog')
const w = require('../util/w')
const {createAuthClient} = require('../clients')
const {createHabilitation, fetchHabilitation} = require('./model')

async function habilitationsRoutes(params = {}) {
  const app = new express.Router()
  const authClient = createAuthClient({clients: params.clients})

  app.param('codeCommune', (req, res, next) => {
    if (!isCommuneActuelle(req.params.codeCommune)) {
      return next(createError(404, 'Le code commune n’existe pas ou n’est plus en vigueur'))
    }

    req.codeCommune = req.params.codeCommune
    next()
  })

  app.param('habilitationId', w(async (req, res, next) => {
    const {habilitationId} = req.params
    const habilitation = await fetchHabilitation(habilitationId)

    if (!habilitation) {
      throw createError(404, 'L’identifiant de l’habilitation demandé n’existe pas')
    }

    req.habilitation = habilitation
    next()
  }))

  app.post('/communes/:codeCommune/habilitation', authClient, w(async (req, res) => {
    if (!req.body.context) {
      throw createError(400, 'Le contenu de la requête est invalide (context absent)')
    }

    if ('nomComplet' in req.body.context && !isString(req.body.context.nomComplet)) {
      throw createError(400, 'Le contenu de la requête est invalide (nomComplet)')
    }

    if ('organisation' in req.body.context && !isString(req.body.context.organisation)) {
      throw createError(400, 'Le contenu de la requête est invalide (organisation)')
    }

    if ('extras' in req.body.context && !isPlainObject(req.body.context.extras)) {
      throw createError(400, 'Le contenu de la requête est invalide (extras)')
    }

    const {nomComplet, organisation, extras} = req.body.context

    const habilitation = await createHabilitation({
      context: {nomComplet, organisation, extras},
      codeCommune: req.codeCommune,
      client: req.client
    })

    res.status(201).send(habilitation)
  }))

  app.get('/habilitations/:habilitationId', authClient, w(async (req, res) => {
    res.send(req.habilitation)
  }))

  app.use(errorHandler)

  return app
}

module.exports = {habilitationsRoutes}
