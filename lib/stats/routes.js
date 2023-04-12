const express = require('express')
const createError = require('http-errors')
const {sub, startOfDay, endOfDay} = require('date-fns')
const errorHandler = require('../util/error-handler')
const w = require('../util/w')
const Revisions = require('../revisions/model')
const {ensureIsAdmin} = require('../util/middlewares')
const {checkFromIsBeforeTo, isValidDate} = require('../util/date')
const StatsService = require('./service')

function checkQueryDateFromTo(req) {
  if ((req.query.from && !req.query.to) || (!req.query.from && req.query.to)) {
    throw createError(400, 'Il manque une date from ou to')
  }

  if (req.query.from && req.query.to) {
    if (!isValidDate(req.query.from) || !isValidDate(req.query.to)) {
      throw createError(400, 'Les dates ne sont pas valides')
    }

    if (!checkFromIsBeforeTo(req.query.from, req.query.to)) {
      throw createError(400, 'La date from est plus vielle que la date to')
    }
  }
}

async function statsRoutes() {
  const app = new express.Router()

  app.use(express.json())

  app.get('/stats/firsts-publications', ensureIsAdmin, w(async (req, res) => {
    checkQueryDateFromTo(req)
    const dates = {
      from: req.query.from ? startOfDay(new Date(req.query.from)) : sub(new Date(), {months: 1}),
      to: req.query.to ? endOfDay(new Date(req.query.to)) : new Date()
    }

    const firstRevisions = await Revisions.getFirstRevisionsPublishedByCommune()
    const cumulFirstRevisionsByDate = StatsService.getCumulFirstRevisionsByDate(firstRevisions, dates)
    res.send(cumulFirstRevisionsByDate)
  }))

  app.get('/stats/publications', ensureIsAdmin, w(async (req, res) => {
    checkQueryDateFromTo(req)
    const dates = {
      from: req.query.from ? startOfDay(new Date(req.query.from)) : sub(new Date(), {months: 1}),
      to: req.query.to ? endOfDay(new Date(req.query.to)) : new Date()
    }

    const revisions = await Revisions.getRevisionsPublishedBetweenDate(dates)
    const balsByDays = StatsService.getBalsByDays(revisions)
    res.send(balsByDays)
  }))

  app.use(errorHandler)

  return app
}

module.exports = {statsRoutes, checkQueryDateFromTo}
