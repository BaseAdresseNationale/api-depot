#!/usr/bin/env node
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const {isString, isPlainObject, create} = require('lodash')
const createError = require('http-errors')
const errorHandler = require('./lib/util/error-handler')
const {isCommuneActuelle} = require('./lib/util/cog')
const w = require('./lib/util/w')
const rawBodyParser = require('./lib/util/raw-body-parser')
const {validateBAL} = require('./lib/validate-bal')
const {authClient} = require('./lib/clients')
const {fetchRevision, createRevision} = require('./lib/revisions')

const app = express()

if (process.env.NODE_ENV !== 'production') {
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

app.post('/communes/:codeCommune/revisions', authClient(), w(async (req, res) => {
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

app.post('/commune/:codeCommune/validate', rawBodyParser(), validateBAL(), (req, res) => {
  res.send({validation: req.validationResult})
})

app.get('/', (req, res) => {
  res.send('Hello world!')
})

app.use(errorHandler)

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log(`Start listening on port ${port}`)
})
