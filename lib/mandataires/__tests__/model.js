const test = require("ava");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongo = require("../../util/mongo");
const Mandataire = require("../model");

let mongod;

const keys = ["_id", "nom", "email", "_createdAt", "_updatedAt"];

test.before("start server", async () => {
  mongod = await MongoMemoryServer.create();
  await mongo.connect(mongod.getUri());
});

test.after.always("cleanup", async () => {
  await mongo.disconnect();
  await mongod.stop();
});

test.afterEach.always(async () => {
  await mongo.db.collection("mandataires").deleteMany({});
});

test.serial("create mandataire", async (t) => {
  const mandataire = await Mandataire.create({
    nom: "ACME",
    email: "iadresses@acme.ltd",
  });

  t.true(keys.every((k) => k in mandataire));
  t.is(Object.keys(mandataire).length, 5);
});

test.serial("update mandataire", async (t) => {
  const now = new Date();
  const _id = new mongo.ObjectId();

  await mongo.db.collection("mandataires").insertOne({
    _id,
    nom: "ACME",
    email: "iadresses@acme.ltd",
    _createdAt: now,
    _updatedAt: now,
  });

  const mandataire = await Mandataire.update(_id, {
    nom: "nouveau nom",
    email: "nouveau@mail.fr",
  });
  t.deepEqual(mandataire._id, _id);
  t.deepEqual(mandataire._createdAt, now);
  t.notDeepEqual(mandataire._updatedAt, now);
  t.is(mandataire.nom, "nouveau nom");
  t.is(mandataire.email, "nouveau@mail.fr");
});

test.serial("update mandataire / extra param", async (t) => {
  const now = new Date();
  const _id = new mongo.ObjectId();

  await mongo.db.collection("mandataires").insertOne({
    _id,
    nom: "ACME",
    email: "iadresses@acme.ltd",
    _createdAt: now,
    _updatedAt: now,
  });

  await t.throwsAsync(Mandataire.update(_id, { foo: "bar" }));
});
