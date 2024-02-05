#!/usr/bin/env node
require('dotenv').config()
const mongo = require('../lib/util/mongo')

async function main() {
  await mongo.connect()

  const chefsDeFile = await mongo.db.collection('chefs_de_file').find({}).toArray()

  for (const chefDeFile of chefsDeFile) {
    const perimetre = chefDeFile.perimetre?.map(p => {
      let [type, code] = p.split('-')

      if (type === 'siren') {
        type = 'epci'
      }

      code = code.replace(/\D/g, '')

      return {
        type,
        code
      }
    }) || []
    // eslint-disable-next-line no-await-in-loop
    await mongo.db.collection('chefs_de_file')
      .updateOne(
        {_id: chefDeFile._id},
        {$set: {perimetre}}
      )
  }

  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
