#!/usr/bin/env node
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const mongo = require('./lib/util/mongo')
const {revisionsRoutes} = require('./lib/revisions/routes')
const {habilitationsRoutes} = require('./lib/habilitations/routes')

async function main() {
  const app = express()
  const port = process.env.PORT || 5000

  app.use(cors({origin: true}))

  await mongo.connect()

  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'))
  }

  const revisions = await revisionsRoutes()
  const habilitation = await habilitationsRoutes()
  app.use('/', revisions)
  app.use('/', habilitation)

  app.listen(port, () => {
    console.log(`Start listening on port ${port}`)
  })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
