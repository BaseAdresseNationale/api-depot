const {S3Client, HeadObjectCommand, PutObjectCommand, GetObjectCommand} = require('@aws-sdk/client-s3')

const s3Client = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  },
  endpoint: process.env.S3_ENDPOINT
})

async function checkS3FileExists(fileId) {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: process.env.S3_CONTAINER_ID,
      Key: fileId
    }))
    return true
  } catch {
    return false
  }
}

async function getS3File(fileId) {
  const response = await s3Client.send(new GetObjectCommand({
    Bucket: process.env.S3_CONTAINER_ID,
    Key: fileId
  }))

  const stream = response.Body

  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', chunk => chunks.push(chunk))
    stream.once('end', () => resolve(Buffer.concat(chunks)))
    stream.once('error', reject)
  })
}

async function uploadS3File(file) {
  const {filename, data} = file
  return s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_CONTAINER_ID,
    Key: filename,
    Body: data
  }))
}

module.exports = {
  checkS3FileExists,
  uploadS3File,
  getS3File
}
