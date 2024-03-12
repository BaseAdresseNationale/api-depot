const express = require('express')
const {isString, isPlainObject} = require('lodash')
const createError = require('http-errors')
const errorHandler = require('../util/error-handler')
const {authClient, ensureCodeCommune, ensureCommuneActuelle, authRevision} = require('../util/middlewares')
const w = require('../util/w')
const rawBodyParser = require('../util/raw-body-parser')
const Revision = require('./model')

async function revisionsRoutes() {
  const app = new express.Router()

  app.use(express.json())

  app.param('codeCommune', ensureCodeCommune)

  app.param('revisionId', w(async (req, res, next) => {
    const {revisionId} = req.params
    const revision = await Revision.fetchRevision(revisionId)

    if (!revision) {
      throw createError(404, 'L’identifiant de révision demandé n’existe pas')
    }

    req.revision = revision
    next()
  }))

  app.get('/communes/:codeCommune/current-revision', w(async (req, res) => {
    const revision = await Revision.getCurrentRevision(req.codeCommune)

    if (!revision) {
      throw createError(404, 'Aucune révision connue pour cette commune')
    }

    const files = await Revision.getFiles(revision)

    const revisionWithPublicClient = await Revision.expandWithClient(revision)

    res.send({...revisionWithPublicClient, files})
  }))

  async function sendBalFile(revision, res) {
    const files = await Revision.getFiles(revision)
    const balFiles = files.filter(f => f.type === 'bal')

    if (balFiles.length !== 1) {
      throw createError(404, 'Aucun fichier de type `bal` associé à cette révision')
    }

    const balFile = balFiles[0]
    const data = await Revision.getFileData(balFile._id)

    res.attachment(balFile.name || `bal-${revision.codeCommune}.csv`)
    res.setHeader('Content-Type', 'text/csv')
    res.send(data)
  }

  app.get('/communes/:codeCommune/current-revision/files/bal/download', w(async (req, res) => {
    const revision = await Revision.getCurrentRevision(req.codeCommune)

    if (!revision) {
      throw createError(404, 'Aucune révision connue pour cette commune')
    }

    await sendBalFile(revision, res)
  }))

  app.get('/communes/:codeCommune/revisions', w(async (req, res) => {
    const status = req.query.status
    const revisions = await Revision.getRevisionsByCommune(req.codeCommune, status)
    const revisionsWithPublicClients = await Promise.all(revisions.map(r => Revision.expandWithClient(r)))

    res.send(revisionsWithPublicClients)
  }))

  app.post('/communes/:codeCommune/revisions', ensureCommuneActuelle, authClient, w(async (req, res) => {
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

    const revision = await Revision.createRevision({
      context: {nomComplet, organisation, extras},
      codeCommune: req.codeCommune,
      client: req.client
    })

    const revisionWithPublicClient = await Revision.expandWithClient(revision)

    res.status(201).send(revisionWithPublicClient)
  }))

  app.get('/revisions/:revisionId', authClient, authRevision, w(async (req, res) => {
    const files = await Revision.getFiles(req.revision)
    const revisionWithPublicClient = await Revision.expandWithClient(req.revision)

    res.send({...revisionWithPublicClient, files})
  }))

  app.put('/revisions/:revisionId/files/bal', authClient, authRevision, rawBodyParser(), w(async (req, res) => {
    if (req.revision.status !== 'pending') {
      throw createError(412, 'La révision n’est plus modifiable')
    }

    if (!Buffer.isBuffer(req.body)) {
      throw createError(400, 'Fichier non fourni')
    }

    const isFileExist = await Revision.isFileExist(req.revision._id, 'bal')
    if (isFileExist) {
      throw createError(412, 'Fichier déjà attaché a la révision')
    }

    try {
      const fileMetadata = await Revision.setFile(req.revision, 'bal', {
        data: req.body,
        name: req.filename || null
      })
      res.send(fileMetadata)
    } catch (error) {
      console.error(`<<FILE>> Impossible d'upload le fichier ${req.revision._id}`)
      console.error(error)
      throw createError(500, 'Une erreur est survenue lors du téléchargement du fichier BAL')
    }
  }))

  app.get('/revisions/:revisionId/files/bal/download', w(async (req, res) => {
    if (req.revision.status !== 'published') {
      throw createError(403, 'La révision n’est pas encore accessible car non publiée')
    }

    await sendBalFile(req.revision, res)
  }))

  app.post('/revisions/:revisionId/publish', authClient, authRevision, w(async (req, res) => {
    if (req.revision.status !== 'pending' || !req.revision.ready) {
      throw createError(412, 'La publication n’est pas possible')
    }

    let habilitation
    if (req.body.habilitationId) {
      habilitation = await Revision.getRelatedHabilitation(req.body.habilitationId, {
        client: req.client,
        codeCommune: req.revision.codeCommune
      })
    }

    const publishedRevision = await Revision.publishRevision(req.revision, {client: req.client, habilitation})
    const publishedRevisionWithPublicClient = await Revision.expandWithClient(publishedRevision)

    res.send(publishedRevisionWithPublicClient)
  }))

  app.post('/revisions/:revisionId/compute', authClient, authRevision, w(async (req, res) => {
    if (req.revision.status !== 'pending') {
      throw createError(412, 'La révision n’est plus modifiable')
    }

    const computedRevision = await Revision.computeRevision(req.revision)
    const computedRevisionWithPublicClient = await Revision.expandWithClient(computedRevision)

    res.send(computedRevisionWithPublicClient)
  }))

  app.get('/current-revisions', w(async (req, res) => {
    const publishedSince = req.query.publishedSince
      ? new Date(req.query.publishedSince)
      : undefined

    const currentRevisions = await Revision.getCurrentRevisions(publishedSince)
    const currentRevisionsWithPublicClients = await Revision.expandWithClients(currentRevisions)

    res.send(currentRevisionsWithPublicClients)
  }))

  app.get('/me', authClient, (req, res) => {
    res.send(req.client)
  })

  app.use(errorHandler)

  return app
}

module.exports = {revisionsRoutes}
