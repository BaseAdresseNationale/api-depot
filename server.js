#!/usr/bin/env node
require('dotenv').config()

const mongo = require('./lib/util/mongo')
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const {revisionsRoutes} = require('./lib/revisions/routes')

async function main() {
  const app = express()
  const port = process.env.PORT || 5000

  app.use(express.json())
  app.use(cors({origin: true}))

  await mongo.connect()

  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'))
  }

  const revisions = await revisionsRoutes()
  app.use('/', revisions)

  app.listen(port, () => {
    console.log(`Start listening on port ${port}`)
  })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
