#!/usr/bin/env node
require('dotenv').config()
const ms = require('ms')
const {unlockAndCleanOverdueCommunes} = require('./lib/communes/model')
const mongo = require('./lib/util/mongo')

const jobs = [
  {
    name: 'unlock and clean overdue commune publications',
    every: '5m',
    async handler() {
      await unlockAndCleanOverdueCommunes()
    }
  }
]

async function main() {
  await mongo.connect()

  for (const job of jobs) {
    setInterval(() => {
      const now = new Date()
      console.log(`${now.toISOString().slice(0, 19)} | running job : ${job.name}`)
      job.handler()
    }, ms(job.every))
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
