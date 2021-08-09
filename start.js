#!/usr/bin/env node
require('dotenv').config()

const {createServer} = require('./lib/server')

async function main() {
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
