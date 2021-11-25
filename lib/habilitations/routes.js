const express = require('express')
const {pick} = require('lodash')
const createError = require('http-errors')
const errorHandler = require('../util/error-handler')
const {communes} = require('../util/cog')
const {ensureCodeCommune} = require('../util/middlewares')
const w = require('../util/w')
const {createAuthClient} = require('../clients')
const {createHabilitation, askHabilitation, validateHabilitation, fetchHabilitation} = require('./model')
const {sendMail} = require('../util/sendmail')
const createPinCodeEmail = require('./strategies/email/pin-code-template')
const {pinCodeValidation, hasBeenSentRecently, generatePinCode, getExpirationDate} = require('./strategies/email')

async function habilitationsRoutes(params = {}) {
  const app = new express.Router()
  const authClient = createAuthClient({clients: params.clients})

  app.use(express.json())

  app.param('codeCommune', ensureCodeCommune)

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
    const habilitation = await createHabilitation({
      codeCommune: req.codeCommune,
      client: req.client
    })

    res.status(201).send(habilitation)
  }))

  app.get('/habilitations/:habilitationId', authClient, w(async (req, res) => {
    res.send(req.habilitation)
  }))

  app.post('/habilitations/:habilitationId/authentication/email/send-pin-code', authClient, w(async (req, res) => {
    const {status, codeCommune, emailCommune, strategy} = req.habilitation

    if (status === 'accepted') {
      throw createError(403, 'Cette habilitation est déjà validée')
    }

    if (status === 'rejected') {
      throw createError(403, 'Cette habilitation est rejetée')
    }

    if (!emailCommune) {
      throw createError(403, 'Impossible d’envoyer le code, aucun courriel n’est connu pour cette commune')
    }

    if (strategy && hasBeenSentRecently(strategy.createAt)) {
      throw createError(409, 'Un courriel a déjà été envoyé, merci de patienter')
    }

    const now = new Date()
    const pinCode = await generatePinCode()
    await askHabilitation(req.habilitation, {
      pinCode,
      type: 'email',
      pinCodeExpiration: getExpirationDate(now),
      remainingAttempts: 10,
      createAt: now,
      validatedAt: null
    })

    const {nom} = pick(communes[codeCommune], 'nom')
    const email = createPinCodeEmail({pinCode, nomCommune: nom})
    await sendMail(email, [emailCommune])

    res.send({code: 200, message: 'OK'})
  }))

  app.post('/habilitations/:habilitationId/authentication/email/validate-pin-code', authClient, w(async (req, res) => {
    if (!req.body.code) {
      throw createError(400, '`code` est un champ obligatoire')
    }

    const {status} = req.habilitation

    if (status === 'accepted') {
      throw createError(403, 'Cette habilitation est déjà validée')
    }

    if (status === 'rejected') {
      throw createError(403, 'Cette habilitation est rejetée')
    }

    const {validated, error} = await pinCodeValidation(req.body.code, req.habilitation)

    if (!validated) {
      return res.send({validated, error})
    }

    const habilitation = await validateHabilitation(req.habilitation)
    res.send(habilitation)
  }))

  app.use(errorHandler)

  return app
}

module.exports = {habilitationsRoutes}
