#!/usr/bin/env node
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const createError = require('http-errors')
const errorHandler = require('./lib/util/error-handler')
const {isCommuneActuelle} = require('./lib/util/cog')
const rawBodyParser = require('./lib/util/raw-body-parser')
const {validateBAL} = require('./lib/validate-bal')

const app = express()

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

app.use(cors({origin: true}))

app.param('codeCommune', (req, res, next) => {
  if (!isCommuneActuelle(req.params.codeCommune)) {
    return next(createError(404, 'Le code commune n’existe pas ou n’est plus en vigueur'))
  }

  req.codeCommune = req.params.codeCommune
  next()
})

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
