require("dotenv").config();

process.env.ADMIN_TOKEN = "xxxxxxxxxxxxxxx";

const test = require("ava");
const express = require("express");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongo = require("../../util/mongo");
const { mandatairesRoutes } = require("../routes");

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
  await mongo.db.collection("mandataires").deleteMany({});
});

async function getApp(params) {
  const app = express();
  const routes = await mandatairesRoutes(params);
  app.use(routes);

  return app;
}

test.serial("create mandataire", async (t) => {
  const server = await getApp();
  const res = await request(server)
    .post("/mandataires")
    .set("Authorization", `Token ${process.env.ADMIN_TOKEN}`)
    .send({
      nom: "ACME",
      email: "me@domain.co",
    })
    .expect(201);

  t.is(res.body.nom, "ACME");
  t.is(res.body.email, "me@domain.co");
});

test.serial("create mandataire / not admin", async (t) => {
  const server = await getApp();
  const res = await request(server)
    .post("/mandataires")
    .send({
      nom: "ACME",
      email: "me@domain.co",
    })
    .expect(401);

  t.is(res.body.message, "Vous n’êtes pas autorisé à effectuer cette action");
});

test.serial("update mandataire", async (t) => {
  const _id = new mongo.ObjectId();
  await mongo.db.collection("mandataires").insertOne({
    _id,
    nom: "ACME",
    email: "me@domain.co",
  });

  const server = await getApp();
  const res = await request(server)
    .put(`/mandataires/${_id}`)
    .set("Authorization", `Token ${process.env.ADMIN_TOKEN}`)
    .send({
      nom: "ACME Corp",
      email: "acme@corp.co",
    })
    .expect(200);

  t.is(res.body.nom, "ACME Corp");
  t.is(res.body.email, "acme@corp.co");
});

test.serial("update mandataire / not admin", async (t) => {
  const _id = new mongo.ObjectId();
  await mongo.db.collection("mandataires").insertOne({
    _id,
    nom: "ACME",
    email: "me@domain.co",
  });

  const server = await getApp();
  const res = await request(server)
    .put(`/mandataires/${_id}`)
    .send({
      nom: "ACME Corp",
      email: "acme@corp.co",
    })
    .expect(401);

  t.is(res.body.message, "Vous n’êtes pas autorisé à effectuer cette action");
});

test.serial("fetch mandataire", async (t) => {
  const _id = new mongo.ObjectId();
  await mongo.db.collection("mandataires").insertOne({
    _id,
    nom: "ACME",
    email: "me@domain.co",
  });

  const server = await getApp();
  const res = await request(server)
    .get(`/mandataires/${_id}`)
    .set("Authorization", `Token ${process.env.ADMIN_TOKEN}`)
    .expect(200);

  t.is(res.body.nom, "ACME");
  t.is(res.body.email, "me@domain.co");
});

test.serial("fetch mandataire / not admin", async (t) => {
  const _id = new mongo.ObjectId();
  await mongo.db.collection("mandataires").insertOne({
    _id,
    nom: "ACME",
    email: "me@domain.co",
  });

  const server = await getApp();
  const res = await request(server).get(`/mandataires/${_id}`).expect(401);

  t.is(res.body.message, "Vous n’êtes pas autorisé à effectuer cette action");
});
