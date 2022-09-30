#!/usr/bin/env node
const {join} = require('path')
const {readFileSync} = require('fs')
const yaml = require('js-yaml')
const mongo = require('../lib/util/mongo')

async function main() {
  await mongo.connect()

  const clients = yaml.load(readFileSync(join(__dirname, '..', 'clients.yml'), 'utf8'))

  await mongo.db.collection('clients').insertMany(clients)

  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
