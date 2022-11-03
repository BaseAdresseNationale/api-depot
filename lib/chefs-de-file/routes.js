const express = require('express')
const createError = require('http-errors')
const errorHandler = require('../util/error-handler')
const {ensureIsAdmin} = require('../util/middlewares')
const w = require('../util/w')
const ChefDeFile = require('./model')

async function chefsDeFileRoutes() {
  const app = new express.Router()

  app.use(express.json())

  app.param('chefDeFileId', w(async (req, res, next) => {
    const {chefDeFileId} = req.params
    const chefDeFile = await ChefDeFile.fetch(chefDeFileId)

    if (!chefDeFile) {
      throw createError(404, 'L’identifiant de chefDeFile demandé n’existe pas')
    }

    req.chefDeFile = chefDeFile
    next()
  }))

  app.route('/chefs-de-file/:chefDeFileId')
    .get(ensureIsAdmin, w(async (req, res) => {
      res.send(req.chefDeFile)
    }))
    .put(ensureIsAdmin, w(async (req, res) => {
      const chefDeFile = await ChefDeFile.update(req.chefDeFile._id, req.body)
      res.send(chefDeFile)
    }))

  app.route('/chefs-de-file')
    .get(ensureIsAdmin, w(async (req, res) => {
      const chefsDeFile = await ChefDeFile.fetchAll()
      res.send(chefsDeFile)
    }))
    .post(ensureIsAdmin, w(async (req, res) => {
      const chefDeFile = await ChefDeFile.create(req.body)
      res.status(201).send(chefDeFile)
    }))

  app.use(errorHandler)

  return app
}

module.exports = {chefsDeFileRoutes}
