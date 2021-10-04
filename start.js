#!/usr/bin/env node
require('dotenv').config()

const {createServer} = require('./server')
const mongo = require('./lib/util/mongo')

async function main() {
  await mongo.connect()
  const server = await createServer()
  const port = process.env.PORT || 5000

  server.listen(port, () => {
    console.log(`Start listening on port ${port}`)
  })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
