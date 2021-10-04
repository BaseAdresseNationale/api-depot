#!/usr/bin/env node
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const {revisionsRoutes} = require('./lib/revisions/routes')

async function createServer(params) {
  const app = express()

  app.use(express.json())
  app.use(cors({origin: true}))

  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'))
  }

  const revisions = await revisionsRoutes(params)
  app.use('/', revisions)

  return app
}

module.exports = {createServer}
