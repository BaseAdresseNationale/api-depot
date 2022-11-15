const express = require('express')
const {isString, isPlainObject} = require('lodash')
const createError = require('http-errors')
const errorHandler = require('../util/error-handler')
const {ensureCodeCommune, ensureCommuneActuelle} = require('../util/middlewares')
const w = require('../util/w')
const rawBodyParser = require('../util/raw-body-parser')
const {createAuthClient} = require('../clients')
const {validateBAL, applyValidateBAL} = require('./validate-bal')
const {fetchRevision, getCurrentRevision, getRevisionsByCommune, createRevision, setFile, getFiles, getFileData, publishRevision, computeRevision, getCurrentRevisions, getRelatedHabilitation} = require('./model')

async function revisionsRoutes(params = {}) {
  const app = new express.Router()
  const authClient = createAuthClient({clients: params.clients})

  app.use(express.json())

  app.param('codeCommune', ensureCodeCommune)

  app.param('revisionId', w(async (req, res, next) => {
    const {revisionId} = req.params
    const revision = await fetchRevision(revisionId)

    if (!revision) {
      throw createError(404, 'L’identifiant de révision demandé n’existe pas')
    }

    req.revision = revision
    next()
  }))

  app.get('/communes/:codeCommune/current-revision', w(async (req, res) => {
    const revision = await getCurrentRevision(req.codeCommune)

    if (!revision) {
      throw createError(404, 'Aucune révision connue pour cette commune')
    }

    const files = await getFiles(revision)

    res.send({...revision, files})
  }))

  async function getObjFromRevision(revision) {
    const revisionData = await getDataFile(revision)
    const result = await applyValidateBAL(revisionData, revision.codeCommune)
    const rowsResult = result.rows

    const getKeyPos = ({pos, lat, lon}) => `${lon}-${lat}-${pos}`
    const getPosObject = ({pos, lat, lon}) => ({[getKeyPos({pos, lon, lat})]: {pos, lon, lat}})

    const adresseObj = rowsResult.reduce((acc, {parsedValues: {
      position: pos,
      lat,
      long: lon,
      lieudit_complement_nom: lieuditComplementNom,
      uid_adresse: uidAdresse,
      voie_nom: voieNom,
      numero,
      suffixe,
      clef_interop: clefInterop
    }}) => {
      // eslint-disable-next-line no-negated-condition
      if (!acc[uidAdresse]) {
        acc[uidAdresse] = {
          id: uidAdresse,
          sign: `${voieNom} - ${lieuditComplementNom} - ${numero} - ${suffixe} - ${clefInterop}`,
          positions: {
            ...getPosObject({pos, lon, lat})
          }
        }
      } else {
        acc[uidAdresse].positions = {
          ...acc[uidAdresse].positions,
          ...getPosObject({pos, lon, lat})
        }
      }

      return acc
    }, {}
    )
    return adresseObj
  }

  async function computeDiffBalFiles(adresseObjV1, adresseObjCurrent) {
    const idsV1 = Object.keys(adresseObjV1)
    const idsCurrent = Object.keys(adresseObjCurrent)

    const newIds = idsV1.filter(item => !idsCurrent.includes(item))
    const deletedIds = idsCurrent.filter(item => !idsV1.includes(item))
    const commonIds = idsCurrent.filter(item => idsV1.includes(item))

    const modifiedIdsSem = []
    const modifiedIdsPos = []
    const distinctKeyPos = []

    for (const idTested of commonIds) {
      if (adresseObjV1[idTested].sign) {
        if (adresseObjV1[idTested].sign !== adresseObjCurrent[idTested].sign) {
          modifiedIdsSem.push(idTested)
        }

        const keysPosV1 = Object.keys(adresseObjV1[idTested].positions)
        const keysPosCurr = Object.keys(adresseObjCurrent[idTested].positions)

        const keysV1Curr = keysPosV1.filter(item => !keysPosCurr.includes(item))
        const keysCurrV1 = keysPosCurr.filter(item => !keysPosV1.includes(item))

        if (keysV1Curr.length > 0) {
          modifiedIdsPos.push(idTested)
        }

        if (keysCurrV1.length > 0) {
          modifiedIdsPos.push(idTested)
        }

        distinctKeyPos.push(...new Set(modifiedIdsPos))
      }
    }

    return {
      countNew: newIds.length,
      newIds,
      countDeleted: deletedIds.length,
      deletedIds,
      countModified: modifiedIdsSem.length + modifiedIdsPos.length,
      'Semantical modifications': modifiedIdsSem,
      'Geometrical modifications': distinctKeyPos
    }
  }

  async function getDataFile(myRevision) {
    const myRevisionFiles = await getFiles(myRevision)
    const myRevisionBalFiles = myRevisionFiles.filter(f => f.type === 'bal')

    if (myRevisionBalFiles.length !== 1) {
      throw createError(404, 'Aucun fichier de type `bal` associé à cette révision')
    }

    const myRevisionBalFile = myRevisionBalFiles[0]
    const myRevisionData = await getFileData(myRevisionBalFile._id)

    return myRevisionData
  }

  async function sendBalFile(revision, res) {
    const files = await getFiles(revision)
    const balFiles = files.filter(f => f.type === 'bal')

    if (balFiles.length !== 1) {
      throw createError(404, 'Aucun fichier de type `bal` associé à cette révision')
    }

    const balFile = balFiles[0]
    const data = await getFileData(balFile._id)

    res.attachment(balFile.name || `bal-${revision.codeCommune}.csv`)
    res.setHeader('Content-Type', 'text/csv')
    res.send(data)
  }

  app.get('/revisions/:revisionId/files/bal/diff', w(async (req, res) => {
    const myRevision = await fetchRevision(req.revision._id)
    if (!myRevision) {
      throw createError(404, 'L’identifiant de révision demandé n’existe pas')
    }

    const currentRevision = await getCurrentRevision(myRevision.codeCommune)
    if (!currentRevision) {
      throw createError(404, 'L’identifiant de révision demandé n’existe pas')
    }

    if (currentRevision._id === myRevision._id) {
      throw createError(500, 'La révision donnée est déja la révision courante')
    }

    const resultDiff = await computeDiffBalFiles(await getObjFromRevision(myRevision), await getObjFromRevision(currentRevision))

    res.status(200).send(resultDiff)
  }))

  app.get('/communes/:codeCommune/current-revision/files/bal/download', w(async (req, res) => {
    const revision = await getCurrentRevision(req.codeCommune)

    if (!revision) {
      throw createError(404, 'Aucune révision connue pour cette commune')
    }

    await sendBalFile(revision, res)
  }))

  app.get('/communes/:codeCommune/revisions', w(async (req, res) => {
    const revisions = await getRevisionsByCommune(req.codeCommune)
    res.send(revisions)
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

    const revision = await createRevision({
      context: {nomComplet, organisation, extras},
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
      throw createError(412, 'La révision n’est plus modifiable')
    }

    if (!Buffer.isBuffer(req.body)) {
      throw createError(400, 'Fichier non fourni')
    }

    const file = await setFile(req.revision, 'bal', {
      data: req.body,
      name: req.filename || null
    })

    res.send(file)
  }))

  app.get('/revisions/:revisionId/files/bal/download', w(async (req, res) => {
    if (req.revision.status !== 'published') {
      throw createError(403, 'La révision n’est pas encore accessible car non publiée')
    }

    await sendBalFile(req.revision, res)
  }))

  app.post('/revisions/:revisionId/publish', authClient, w(async (req, res) => {
    if (req.revision.status !== 'pending' || !req.revision.ready) {
      throw createError(412, 'La publication n’est pas possible')
    }

    let habilitation
    if (req.body.habilitationId) {
      habilitation = await getRelatedHabilitation(req.body.habilitationId, {
        client: req.client,
        codeCommune: req.revision.codeCommune
      })
    }

    const publishedRevision = await publishRevision(req.revision, {client: req.client, habilitation})

    res.send(publishedRevision)
  }))

  app.post('/revisions/:revisionId/compute', authClient, w(async (req, res) => {
    if (req.revision.status !== 'pending') {
      throw createError(412, 'La révision n’est plus modifiable')
    }

    const computedRevision = await computeRevision(req.revision)

    res.send(computedRevision)
  }))

  app.post('/commune/:codeCommune/validate', ensureCommuneActuelle, rawBodyParser(), validateBAL(), (req, res) => {
    res.send({validation: req.validationResult})
  })

  app.get('/current-revisions', w(async (req, res) => {
    const publishedSince = req.query.publishedSince
      ? new Date(req.query.publishedSince)
      : undefined

    const currentRevisions = await getCurrentRevisions(publishedSince)
    res.send(currentRevisions)
  }))

  app.get('/me', authClient, (req, res) => {
    res.send(req.client)
  })

  app.use(errorHandler)

  return app
}

module.exports = {revisionsRoutes}
