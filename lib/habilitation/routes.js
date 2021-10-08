const express = require('express')
const {pick, isString, isPlainObject} = require('lodash')
const createError = require('http-errors')
const errorHandler = require('../util/error-handler')
const {isCommuneActuelle, communes} = require('../util/cog')
const w = require('../util/w')
const {createAuthClient} = require('../clients')
const {createHabilitation, askHabilitation, validateHabilitation, rejectHabilitation, fetchHabilitation} = require('./model')
const {sendMail} = require('../util/sendmail')
const createPinCodeEmail = require('../emails/pin-code')
const {hasBeenSentRecently, generatePinCode, getExpirationDate} = require('../util/pin-code')

async function habilitationsRoutes(params = {}) {
  const app = new express.Router()
  const authClient = createAuthClient({clients: params.clients})

  app.use(express.json())

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

  app.post('/communes/:codeCommune/habilitations', authClient, w(async (req, res) => {
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

  app.post('/habilitations/:habilitationId/send-pin-code', authClient, w(async (req, res) => {
    const {codeCommune, emailCommune, method} = req.habilitation

    if (req.habilitation.status !== 'pending' || !emailCommune) {
      throw createError(403, 'Impossible d’envoyer le code')
    }

    const now = new Date()
    if (method && hasBeenSentRecently(method.createAt)) {
      throw createError(409, 'Un courriel a déjà été envoyé, merci de patienter')
    }

    const pinCode = await generatePinCode()
    await askHabilitation(req.habilitation, {
      pinCode,
      type: 'email',
      pinCodeExpiration: getExpirationDate(now),
      createAt: now,
      validatedAt: null
    })

    const {nom} = pick(communes[codeCommune], 'nom')
    const email = createPinCodeEmail({pinCode, nomCommune: nom})
    await sendMail(email, [emailCommune])

    res.sendStatus(200)
  }))

  app.post('/habilitations/:habilitationId/validate-pin-code', authClient, w(async (req, res) => {
    if (!req.body.code) {
      throw createError(400, '`code` est un champ obligatoire')
    }

    const {status, strategy} = req.habilitation

    if (status !== 'active' || !strategy) {
      throw createError(403, 'Impossible de valider le code')
    }

    if (req.body.code !== strategy.pinCode) {
      await rejectHabilitation()
      return res.send({validated: false, error: 'Code non valide, demande d’habilitation rejetée'})
    }

    const now = new Date()
    if (now > strategy.pinCodeExpiration) {
      return res.send({validated: false, error: 'Code expiré'})
    }

    const habilitation = await validateHabilitation(req.habilitation)
    res.send(habilitation)
  }))

  app.use(errorHandler)

  return app
}

module.exports = {habilitationsRoutes}
