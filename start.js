#!/usr/bin/env node
require('dotenv').config()

const {join} = require('path')
const {readFileSync} = require('fs')
const yaml = require('js-yaml')
const {createServer} = require('./lib/server')
const mongo = require('./lib/util/mongo')

const clients = yaml.load(readFileSync(join(__dirname, 'clients.yml'), 'utf8'))

async function main() {
  await mongo.connect()
  const server = await createServer({clients})
  const port = process.env.PORT || 5000

  server.listen(port, () => {
    console.log(`Start listening on port ${port}`)
  })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
