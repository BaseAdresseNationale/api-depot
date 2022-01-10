const express = require('express')
const createError = require('http-errors')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const passport = require('passport')
const {omit} = require('lodash')
const mongo = require('../util/mongo')
const errorHandler = require('../util/error-handler')
const {getCommune} = require('../util/cog')
const {ensureCodeCommune} = require('../util/middlewares')
const w = require('../util/w')
const {createAuthClient} = require('../clients')
const {createHabilitation, askHabilitation, acceptHabilitation, fetchHabilitation, rejectHabilitation} = require('./model')
const {sendMail} = require('../util/sendmail')
const createPinCodeEmail = require('./strategies/email/pin-code-template')
const {pinCodeValidation, hasBeenSentRecently, generatePinCode, getExpirationDate} = require('./strategies/email')
const {createFranceConnectStrategy, getMandatCommune} = require('./strategies/franceconnect')

const DEMO_MODE = process.env.DEMO_MODE === '1'

async function habilitationsRoutes(params = {}) {
  const app = new express.Router()
  const authClient = createAuthClient({clients: params.clients})

  app.use(express.json())

  const sessionOptions = {
    secret: process.env.SESSION_SECRET || 'foobar',
    saveUninitialized: false,
    resave: false
  }

  if (process.env.NODE_ENV === 'production') {
    sessionOptions.store = MongoStore.create({client: mongo.client, dbName: mongo.dbName})
  }

  app.use(session(sessionOptions))
  app.use(passport.initialize())

  if (process.env.FC_SERVICE_URL) {
    passport.use('franceconnect', createFranceConnectStrategy())
  }

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
    res.send(omit(req.habilitation, 'strategy.pinCode'))
  }))

  app.post('/habilitations/:habilitationId/authentication/email/send-pin-code', authClient, w(async (req, res) => {
    const {status, codeCommune, emailCommune, strategy} = req.habilitation

    if (status === 'accepted') {
      throw createError(412, 'Cette habilitation est déjà validée')
    }

    if (status === 'rejected') {
      throw createError(412, 'Cette habilitation est rejetée')
    }

    if (!emailCommune) {
      throw createError(412, 'Impossible d’envoyer le code, aucun courriel n’est connu pour cette commune')
    }

    if (strategy && hasBeenSentRecently(strategy.createdAt)) {
      throw createError(409, 'Un courriel a déjà été envoyé, merci de patienter')
    }

    const now = new Date()
    const pinCode = await generatePinCode()
    await askHabilitation(req.habilitation, {
      pinCode,
      type: 'email',
      pinCodeExpiration: getExpirationDate(now),
      remainingAttempts: 10,
      createdAt: now
    })

    const {nom} = getCommune(codeCommune)
    const email = createPinCodeEmail({pinCode, nomCommune: nom})

    if (!DEMO_MODE) {
      await sendMail(email, [emailCommune])
    }

    res.send({code: 200, message: 'OK'})
  }))

  app.post('/habilitations/:habilitationId/authentication/email/validate-pin-code', authClient, w(async (req, res) => {
    if (!req.body.code) {
      throw createError(400, '`code` est un champ obligatoire')
    }

    const {status} = req.habilitation

    if (status === 'accepted') {
      throw createError(412, 'Cette habilitation est déjà validée')
    }

    if (status === 'rejected') {
      throw createError(412, 'Cette habilitation est rejetée')
    }

    const {validated, error, remainingAttempts} = await pinCodeValidation(req.body.code, req.habilitation)

    if (!validated) {
      return res.send({validated, error, remainingAttempts})
    }

    await acceptHabilitation(req.habilitation._id)
    res.send(await fetchHabilitation(req.habilitation._id))
  }))

  app.route('/habilitations/:habilitationId/authentication/franceconnect').get((req, res, next) => {
    if (!req.query.redirectUrl) {
      return res.status(400).send('redirectUrl param is mandatory')
    }

    req.session.habilitationId = req.params.habilitationId
    req.session.redirectUrl = decodeURIComponent(req.query.redirectUrl)

    if (req.habilitation.status !== 'pending') {
      return res.redirect(req.session.redirectUrl)
    }

    passport.authenticate('franceconnect')(req, res, next)
  })

  app.route('/habilitations/franceconnect/callback').get(
    w((req, res, next) => {
      if (!req.session.habilitationId) {
        throw createError(500, 'Session invalide')
      }

      req.habilitationId = req.session.habilitationId
      req.redirectUrl = req.session.redirectUrl

      const authenticateOptions = {
        session: false,
        failureRedirect: req.redirectUrl
      }
      passport.authenticate('franceconnect', authenticateOptions)(req, res, next)
    }),
    w(async (req, res) => {
      const habilitation = await fetchHabilitation(req.habilitationId)

      if (!habilitation) {
        throw createError(500, 'Cette habilitation n’existe plus. Impossible de poursuivre')
      }

      const {status} = habilitation

      if (status === 'accepted' || status === 'rejected') {
        return res.redirect(req.redirectUrl)
      }

      const mandat = getMandatCommune(req.user, habilitation.codeCommune)

      if (mandat) {
        await acceptHabilitation(habilitation._id, {
          strategy: {
            type: 'franceconnect',
            mandat
          }
        })
      } else {
        await rejectHabilitation(habilitation._id, {
          strategy: {
            type: 'franceconnect',
            authenticationError: 'Aucun mandat valide trouvé pour cette commune'
          }
        })
      }

      res.redirect(req.redirectUrl)
    })
  )

  app.use(errorHandler)

  return app
}

module.exports = {habilitationsRoutes}
