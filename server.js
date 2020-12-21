#!/usr/bin/env node
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const app = express()

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

app.use(cors({origin: true}))

app.get('/', (req, res) => {
  res.send('Hello world!')
})

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log(`Start listening on port ${port}`)
})
