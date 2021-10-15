const express = require('express')
const {pick} = require('lodash')
const createError = require('http-errors')
const errorHandler = require('../util/error-handler')
const {isCommuneActuelle, communes} = require('../util/cog')
const w = require('../util/w')
const {createAuthClient} = require('../clients')
const {createHabilitation, askHabilitation, validateHabilitation, decreasesRemainingAttempts, rejectHabilitation, fetchHabilitation} = require('./model')
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
    const habilitation = await createHabilitation({
      codeCommune: req.codeCommune,
      client: req.client
    })

    res.status(201).send(habilitation)
  }))

  app.get('/habilitations/:habilitationId', authClient, w(async (req, res) => {
    res.send(req.habilitation)
  }))

  app.post('/habilitations/:habilitationId/authentification/email/send-pin-code', authClient, w(async (req, res) => {
    const {status, codeCommune, emailCommune, strategy} = req.habilitation

    if (status === 'validate') {
      throw createError(403, 'Cette habilitation est déjà validée')
    }

    if (status === 'rejected') {
      throw createError(403, 'Cette habilitation est rejetée')
    }

    if (!emailCommune) {
      throw createError(403, 'Impossible d’envoyer le code, aucun courriel n’est connu pour cette commune')
    }

    if (status === 'active' && hasBeenSentRecently(strategy.createAt)) {
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

    res.sendStatus(200)
  }))

  app.post('/habilitations/:habilitationId/authentification/email/validate-pin-code', authClient, w(async (req, res) => {
    if (!req.body.code) {
      throw createError(400, '`code` est un champ obligatoire')
    }

    const {status, strategy} = req.habilitation

    if (status === 'validate') {
      throw createError(403, 'Cette habilitation est déjà validée')
    }

    if (status === 'rejected') {
      throw createError(403, 'Cette habilitation est rejetée')
    }

    if (status === 'pending' || !strategy) {
      throw createError(403, 'Aucun code d’authentification n’est associé à cette habilitation')
    }

    if (req.body.code !== strategy.pinCode) {
      const {strategy} = await decreasesRemainingAttempts(req.habilitation._id)

      if (strategy.remainingAttempts === 0) {
        await rejectHabilitation()
        return res.send({validated: false, error: 'Code non valide, demande d’habilitation rejetée'})
      }

      const plural = strategy.remainingAttempts > 1 ? 's' : ''
      return res.send({validated: false, error: `Code non valide, ${strategy.remainingAttempts} tentative${plural} retestante${plural}`})
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
