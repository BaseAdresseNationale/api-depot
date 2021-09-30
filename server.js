#!/usr/bin/env node
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const {authenticateClient} = require('./lib/clients')
const {revisionsRoutes} = require('./revisions/routes')

async function createServer({clients}) {
  const app = express()

  app.use(express.json())
  app.use(cors({origin: true}))

  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'))
  }

  const authClient = authenticateClient(clients)
  const revisions = await revisionsRoutes({authClient})

  app.use('/', revisions)

  return app
}

module.exports = {createServer}
