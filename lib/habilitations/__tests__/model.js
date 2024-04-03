const test = require("ava");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongo = require("../../util/mongo");
const Habilitation = require("../model");
const { decreasesRemainingAttempts } = require("../strategies/email");

let mongod;

test.before("start server", async () => {
  mongod = await MongoMemoryServer.create();
  await mongo.connect(mongod.getUri());
});

test.after.always("cleanup", async () => {
  await mongo.disconnect();
  await mongod.stop();
});

test("create an habilitation", async (t) => {
  const habilitation = await Habilitation.createHabilitation({
    codeCommune: "27115",
    client: { _id: new mongo.ObjectId() },
  });

  const keys = [
    "_id",
    "codeCommune",
    "emailCommune",
    "franceconnectAuthenticationUrl",
    "strategy",
    "client",
    "status",
    "createdAt",
    "updatedAt",
    "expiresAt",
  ];

  t.true(keys.every((k) => k in habilitation));
  t.is(habilitation.status, "pending");
  t.is(Object.keys(habilitation).length, 10);
});

test("Ask for an habilitation", async (t) => {
  const now = new Date();
  const _id = new mongo.ObjectId();
  const habilitation = {
    _id,
    updatedAt: now,
    createdAt: now,
    status: "pending",
  };
  await mongo.db.collection("habilitations").insertOne(habilitation);

  const strategy = {
    pinCode: "000000",
    type: "email",
    pinCodeExpiration: null,
    createdAt: null,
  };

  const pendingHabilitation = await Habilitation.askHabilitation(
    habilitation,
    strategy,
  );
  t.is(pendingHabilitation.status, "pending");
  t.not(pendingHabilitation.updatedAt, now);
  t.truthy(pendingHabilitation.strategy);
});

test("Accept habilitation", async (t) => {
  const now = new Date();
  const _id = new mongo.ObjectId();
  const habilitation = {
    _id,
    updatedAt: now,
    createdAt: now,
    strategy: { pinCode: "000000", type: "email" },
  };
  await mongo.db.collection("habilitations").insertOne(habilitation);
  await Habilitation.acceptHabilitation(_id);

  const acceptedHabilitation = await mongo.db
    .collection("habilitations")
    .findOne({ _id });

  t.is(acceptedHabilitation.status, "accepted");
  t.not(acceptedHabilitation.updatedAt, now);
  t.truthy(acceptedHabilitation.strategy);
  t.truthy(acceptedHabilitation.expiresAt);
});

test("Decrease remaining attempts", async (t) => {
  const now = new Date();
  const _id = new mongo.ObjectId();
  const habilitation = {
    _id,
    updatedAt: now,
    createdAt: now,
    strategy: { pinCode: "000000", type: "email", remainingAttempts: 5 },
  };
  await mongo.db.collection("habilitations").insertOne(habilitation);

  const updatedHabilitation = await decreasesRemainingAttempts(
    habilitation._id,
  );
  t.is(updatedHabilitation.strategy.remainingAttempts, 4);
});

test("Reject habilitation", async (t) => {
  const now = new Date();
  const _id = new mongo.ObjectId();
  const habilitation = {
    _id,
    updatedAt: now,
    createdAt: now,
    strategy: { pinCode: "000000", type: "email", remainingAttempts: 5 },
  };
  await mongo.db.collection("habilitations").insertOne(habilitation);

  await Habilitation.rejectHabilitation(habilitation._id);

  const rejectedHabilitation = await Habilitation.fetchHabilitation(_id);
  t.is(rejectedHabilitation.status, "rejected");
});

test("Fetch habilitation", async (t) => {
  const now = new Date();
  const _id = new mongo.ObjectId();
  const habilitation = {
    _id,
    status: "pending",
    updatedAt: now,
    createdAt: now,
  };
  await mongo.db.collection("habilitations").insertOne(habilitation);

  const fetchedHabilitation = await Habilitation.fetchHabilitation(
    habilitation._id,
  );
  t.is(fetchedHabilitation.status, "pending");
  t.deepEqual(fetchedHabilitation.updatedAt, now);
  t.deepEqual(fetchedHabilitation.createdAt, now);
});
