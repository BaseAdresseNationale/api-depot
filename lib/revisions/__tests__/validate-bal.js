const { join } = require("path");
const { readFile } = require("fs").promises;
const test = require("ava");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongo = require("../../util/mongo");
const { applyValidateBAL } = require("../validate-bal");

let mongod;

test.before("start server", async () => {
  mongod = await MongoMemoryServer.create();
  await mongo.connect(mongod.getUri());
});

test.after.always("cleanup", async () => {
  await mongo.disconnect();
  await mongod.stop();
});

test.afterEach.always(async () => {
  await mongo.db.collection("chefs_de_file").deleteMany({});
});

test.serial("applyValidateBAL - errored rows count", async (t) => {
  const balFile = await readFile(join(__dirname, "fixtures", "bal-valid.csv"));
  await t.throwsAsync(
    () => applyValidateBAL(balFile, "31591", null, { rowsCountValue: "14" }),
    undefined,
    "Le fichier BAL analysé ne comporte pas le nombre de lignes de données indiqué dans l’en-tête X-Rows-Count.",
  );
});

test.serial("applyValidateBAL - valid", async (t) => {
  const balFile = await readFile(join(__dirname, "fixtures", "bal-valid.csv"));
  const { validation, rows } = await applyValidateBAL(balFile, "31591", null, {
    rowsCountValue: "6",
  });
  t.is(validation.valid, true);
  t.is(rows.length, 6);
});

test.serial("applyValidateBAL - not valid", async (t) => {
  const balFile = await readFile(
    join(__dirname, "fixtures", "bal-not-valid.csv"),
  );
  const { validation } = await applyValidateBAL(balFile, "31591", null, {
    rowsCountValue: "6",
  });
  t.is(validation.valid, false);
  t.is(validation.errors.length, 2);
  t.deepEqual(validation.errors, [
    "voie_nom.valeur_manquante",
    "row.adresse_incomplete",
  ]);
});

test.serial("applyValidateBAL - warnings", async (t) => {
  const balFile = await readFile(
    join(__dirname, "fixtures", "bal-warnings.csv"),
  );
  const { validation } = await applyValidateBAL(balFile, "31591", null, {
    rowsCountValue: "6",
  });

  t.is(validation.valid, true);
  t.is(validation.errors.length, 0);

  t.is(validation.warnings.length, 2);
  t.deepEqual(
    validation.warnings.sort(),
    ["field.certification_commune.missing", "source.valeur_manquante"].sort(),
  );

  t.is(validation.infos.length, 5);
  t.deepEqual(
    validation.infos.sort(),
    [
      "field.lieudit_complement_nom.missing",
      "field.commune_deleguee_insee.missing",
      "field.commune_deleguee_nom.missing",
      "field.cad_parcelles.missing",
      "cle_interop.voie_non_renseignee",
    ].sort(),
  );
});

test.serial("applyValidateBAL - bad perimeter", async (t) => {
  const balFile = await readFile(join(__dirname, "fixtures", "bal-valid.csv"));
  const chefDeFileId = new mongo.ObjectId();
  await mongo.db.collection("chefs_de_file").insertOne({
    _id: chefDeFileId,
    perimetre: [{ type: "commune", code: "27115" }],
  });
  const client = {
    chefDeFile: chefDeFileId,
  };
  const { validation, rows } = await applyValidateBAL(
    balFile,
    "31591",
    client,
    { rowsCountValue: "6" },
  );

  t.is(validation.valid, false);
  t.is(rows.length, 6);
  t.deepEqual(
    validation.errors.sort(),
    ["commune_insee.out_of_perimeter"].sort(),
  );
});

test.serial("applyValidateBAL - good perimeter", async (t) => {
  const balFile = await readFile(join(__dirname, "fixtures", "bal-valid.csv"));
  const chefDeFileId = new mongo.ObjectId();
  await mongo.db.collection("chefs_de_file").insertOne({
    _id: chefDeFileId,
    perimetre: [{ type: "commune", code: "31591" }],
  });
  const client = {
    chefDeFile: chefDeFileId,
  };
  const { validation, rows } = await applyValidateBAL(
    balFile,
    "31591",
    client,
    { rowsCountValue: "6" },
  );

  t.is(validation.valid, true);
  t.is(rows.length, 6);
});
