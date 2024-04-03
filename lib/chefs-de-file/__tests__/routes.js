require("dotenv").config();

process.env.ADMIN_TOKEN = "xxxxxxxxxxxxxxx";

const test = require("ava");
const express = require("express");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongo = require("../../util/mongo");
const { chefsDeFileRoutes } = require("../routes");

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

async function getApp(params) {
  const app = express();
  const routes = await chefsDeFileRoutes(params);
  app.use(routes);

  return app;
}

test.serial("create chefDeFile", async (t) => {
  const server = await getApp();
  const res = await request(server)
    .post("/chefs-de-file")
    .set("Authorization", `Token ${process.env.ADMIN_TOKEN}`)
    .send({
      nom: "ACME",
      email: "iadresses@acme.ltd",
      isEmailPublic: true,
      perimetre: [{ type: "commune", code: "27115" }],
      signataireCharte: true,
    })
    .expect(201);

  t.is(res.body.nom, "ACME");
  t.is(res.body.email, "iadresses@acme.ltd");
  t.deepEqual(res.body.perimetre, [{ type: "commune", code: "27115" }]);
  t.is(res.body.signataireCharte, true);
});

test.serial("create chefDeFile / not admin", async (t) => {
  const server = await getApp();
  const res = await request(server)
    .post("/chefs-de-file")
    .send({
      nom: "ACME",
      email: "iadresses@acme.ltd",
      perimetre: [{ type: "commune", code: "27115" }],
      signataireCharte: true,
    })
    .expect(401);

  t.is(res.body.message, "Vous n’êtes pas autorisé à effectuer cette action");
});

test.serial("update chefDeFile", async (t) => {
  const _id = new mongo.ObjectId();
  await mongo.db.collection("chefs_de_file").insertOne({
    _id,
    nom: "ACME",
    email: "iadresses@acme.ltd",
    perimetre: [{ type: "commune", code: "27115" }],
    signataireCharte: false,
  });

  const server = await getApp();
  const res = await request(server)
    .put(`/chefs-de-file/${_id}`)
    .set("Authorization", `Token ${process.env.ADMIN_TOKEN}`)
    .send({
      signataireCharte: true,
    })
    .expect(200);

  t.is(res.body.signataireCharte, true);
});

test.serial("update chefDeFile / not admin", async (t) => {
  const _id = new mongo.ObjectId();
  await mongo.db.collection("chefs_de_file").insertOne({
    _id,
    nom: "ACME",
    email: "iadresses@acme.ltd",
    perimetre: [{ type: "commune", code: "27115" }],
    signataireCharte: false,
  });

  const server = await getApp();
  const res = await request(server)
    .put(`/chefs-de-file/${_id}`)
    .send({
      signataireCharte: true,
    })
    .expect(401);

  t.is(res.body.message, "Vous n’êtes pas autorisé à effectuer cette action");
});

test.serial("fetch chefDeFile", async (t) => {
  const _id = new mongo.ObjectId();
  await mongo.db.collection("chefs_de_file").insertOne({
    _id,
    nom: "ACME",
    email: "iadresses@acme.ltd",
    perimetre: [{ type: "commune", code: "27115" }],
    signataireCharte: false,
  });

  const server = await getApp();
  const res = await request(server)
    .get(`/chefs-de-file/${_id}`)
    .set("Authorization", `Token ${process.env.ADMIN_TOKEN}`)
    .expect(200);

  t.is(res.body.nom, "ACME");
  t.is(res.body.email, "iadresses@acme.ltd");
  t.deepEqual(res.body.perimetre, [{ type: "commune", code: "27115" }]);
  t.is(res.body.signataireCharte, false);
});

test.serial("fetch chefDeFile / not admin", async (t) => {
  const _id = new mongo.ObjectId();
  const chefDeFile = {
    _id,
    nom: "ACME",
    organisme: "ACME SARL",
    email: "me@domain.co",
    token: "foobar",
  };
  await mongo.db.collection("chefs_de_file").insertOne(chefDeFile);

  const server = await getApp();
  const res = await request(server).get(`/chefs-de-file/${_id}`).expect(401);

  t.is(res.body.message, "Vous n’êtes pas autorisé à effectuer cette action");
});
