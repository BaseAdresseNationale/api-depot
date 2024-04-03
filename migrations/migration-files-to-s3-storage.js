#!/usr/bin/env node
require("dotenv").config();
const mongo = require("../lib/util/mongo");
const { s3Service } = require("./../lib/files/s3.service");

async function main() {
  await mongo.connect();

  const filesCursor = await mongo.db.collection("files").find({});
  const total = await mongo.db.collection("files").estimatedDocumentCount();
  let count = 0;

  for await (const file of filesCursor) {
    count++;

    const fileId = file._id.toHexString();
    const fileAlreadyExists =
      fileId && (await s3Service.checkS3FileExists(fileId));
    if (fileAlreadyExists) {
      console.log(
        `Skipping upload for file ${fileId}. Reason: Already uploaded`,
      );
      continue;
    }

    console.log(`Uploading CSV file for file ${fileId}`);
    await s3Service.uploadS3File({
      filename: fileId,
      data: file.data.buffer,
    });
    console.log(`Upload OK, ${count} / ${total} files processed`);
  }

  await mongo.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
