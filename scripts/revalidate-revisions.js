#!/usr/bin/env node
/* eslint no-await-in-loop: off */
require("dotenv").config();

const validatorVersion =
  require("@ban-team/validateur-bal/package.json").version;
const mongo = require("../lib/util/mongo");
const {
  fetchRevision,
  getFiles,
  getFileData,
} = require("../lib/revisions/model");
const { applyValidateBAL } = require("../lib/revisions/validate-bal");

async function main() {
  await mongo.connect();

  const query = {
    status: "published",
    current: true,
    "validation.validatorVersion": { $ne: validatorVersion },
  };

  const revisionsToRevalidate = await mongo.db
    .collection("revisions")
    .distinct("_id", query);

  for (const revisionId of revisionsToRevalidate) {
    console.log(revisionId);
    const revision = await fetchRevision(revisionId);
    const files = await getFiles(revision);

    const balFile = files.find((f) => f.type === "bal");
    const data = await getFileData(balFile._id);
    const relaxMode = revision.client.options?.relaxMode;
    const { validation } = await applyValidateBAL(data, revision.codeCommune, {
      relaxMode,
    });
    const { errors, warnings, infos, rowsCount } = validation;

    await mongo.db.collection("revisions").updateOne(
      { _id: revisionId },
      {
        $set: {
          validation: {
            valid: true,
            validatorVersion,
            errors,
            warnings,
            infos,
            rowsCount,
          },
        },
      },
    );
  }

  await mongo.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
