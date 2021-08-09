const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const {isString, isPlainObject} = require('lodash')
const createError = require('http-errors')
const errorHandler = require('./util/error-handler')
const {isCommuneActuelle} = require('./util/cog')
const w = require('./util/w')
const rawBodyParser = require('./util/raw-body-parser')
const {validateBAL} = require('./validate-bal')
const {authenticateClient} = require('./clients')
const {fetchRevision, createRevision, setFile, getFiles, publishRevision, computeRevision} = require('./revisions')

async function createServer(options = {}) {
  const {clients} = options

  const app = express()
  const authClient = authenticateClient(clients)

  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'))
  }

  app.use(cors({origin: true}))
  app.use(express.json())

  app.param('codeCommune', (req, res, next) => {
    if (!isCommuneActuelle(req.params.codeCommune)) {
      return next(createError(404, 'Le code commune n’existe pas ou n’est plus en vigueur'))
    }

    req.codeCommune = req.params.codeCommune
    next()
  })

  app.param('revisionId', w(async (req, res, next) => {
    const {revisionId} = req.params
    const revision = await fetchRevision(revisionId)

    if (!revision) {
      throw createError(404, 'L’identifiant de révision demandé n’existe pas')
    }

    req.revision = revision
    next()
  }))

  app.post('/communes/:codeCommune/revisions', authClient, w(async (req, res) => {
    // {nomComplet, organisation, extras, codeCommune, client}
    if ('nomComplet' in req.body && !isString(req.body.nomComplet)) {
      throw createError(400, 'Le contenu de la requête est invalide (nomComplet)')
    }

    if ('organisation' in req.body && !isString(req.body.organisation)) {
      throw createError(400, 'Le contenu de la requête est invalide (organisation)')
    }

    if ('extras' in req.body && !isPlainObject(req.body.extras)) {
      throw createError(400, 'Le contenu de la requête est invalide (extras)')
    }

    const revision = await createRevision({
      nomComplet: req.body.nomComplet,
      organisation: req.body.organisation,
      extras: req.body.extras,
      codeCommune: req.codeCommune,
      client: req.client
    })

    res.status(201).send(revision)
  }))

  app.get('/revisions/:revisionId', authClient, w(async (req, res) => {
    const files = await getFiles(req.revision)
    res.send({...req.revision, files})
  }))

  app.put('/revisions/:revisionId/files/bal', authClient, rawBodyParser(), w(async (req, res) => {
    if (req.revision.status !== 'pending') {
      throw createError(403, 'La révision n’est plus modifiable')
    }

    if (!Buffer.isBuffer(req.body)) {
      throw createError(400, 'Fichier non fourni')
    }

    const file = await setFile(req.revision, 'bal', {
      data: req.body,
      name: req.filename || null
    })

    res.status(201).send(file)
  }))

  app.post('/revisions/:revisionId/publish', authClient, w(async (req, res) => {
    if (req.revision.status !== 'pending' || !req.revision.ready) {
      throw createError(403, 'La publication n’est pas possible')
    }

    const publishedRevision = await publishRevision(req.revision)

    res.send(publishedRevision)
  }))

  app.post('/revisions/:revisionId/compute', authClient, w(async (req, res) => {
    if (req.revision.status !== 'pending') {
      throw createError(403, 'La révision n’est plus modifiable')
    }

    const computedRevision = await computeRevision(req.revision)

    res.send(computedRevision)
  }))

  app.post('/commune/:codeCommune/validate', rawBodyParser(), validateBAL(), (req, res) => {
    res.send({validation: req.validationResult})
  })

  app.get('/me', authClient, (req, res) => {
    res.send(req.client)
  })

  app.get('/', (req, res) => {
    res.send('Hello world!')
  })

  app.use(errorHandler)

  return app
}

module.exports = {createServer}
