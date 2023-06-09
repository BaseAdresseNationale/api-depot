#!/usr/bin/env node
require('dotenv').config()
const mongo = require('../lib/util/mongo')
const {checkS3FileExists, uploadS3File} = require('./../lib/files/s3.service')
const {getFiles, getFileData} = require('./../lib/revisions/model')

async function main() {
  await mongo.connect()

  const revisionsCursor = await mongo.db.collection('revisions').find({})
  const total = await mongo.db.collection('revisions').countDocuments()
  let count = 0

  for await (const revision of revisionsCursor) {
    count++
    const revisionId = revision._id.toHexString()
    const files = await getFiles(revision)
    const balFiles = files.filter(f => f.type === 'bal')
    const balFileId = balFiles[0] && balFiles[0]._id.toHexString()
    const fileAlreadyExists = balFileId && await checkS3FileExists(revisionId)
    if (balFiles.length !== 1 || fileAlreadyExists) {
      // eslint-disable-next-line no-negated-condition
      console.log(`Skipping upload for revision ${revisionId}. Reason: ${balFiles.length !== 1 ? 'Incorrect number of files' : 'Already uploaded'}`)
      continue
    }

    const balFileData = await getFileData(balFileId)
    console.log(`Uploading CSV file for file ${balFileId}`)
    await uploadS3File({
      filename: balFileId,
      data: balFileData
    })
    console.log(`Upload OK, ${count} / ${total} revisions processed`)
  }

  await mongo.disconnect()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
