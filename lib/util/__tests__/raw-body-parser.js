const path = require("path");
const { readFileSync } = require("fs");
const test = require("ava");
const express = require("express");
const request = require("supertest");
const errorHandler = require("../error-handler");
const rawBodyParser = require("../raw-body-parser");

const randomFile = readFileSync(
  path.join(__dirname, "fixtures", "random-file"),
);
const randomFileMD5 = "71e5090e1cca0942129e95c675edbdbb";
const randomFileGz = readFileSync(
  path.join(__dirname, "fixtures", "random-file.gz"),
);
const randomFileGzMD5 = "1db697505148f8d48a8921f6680c2a29";

function createServer() {
  const app = express();

  app.post("/", rawBodyParser(), (req, res) => {
    res.send({
      value: req.body.toString(),
      filename: req.filename,
    });
  });

  app.use(errorHandler);
  return app;
}

test("rawBodyParser / no header", async (t) => {
  const { body } = await request(createServer())
    .post("/")
    .set("Content-Type", "text/plain")
    .send(randomFile)
    .expect(200);

  t.is(body.value, "azertyuiop\n");
});

test("rawBodyParser / filename", async (t) => {
  const { body } = await request(createServer())
    .post("/")
    .set("Content-Type", "text/plain")
    .set("Content-Disposition", "attachment; filename=toto.txt")
    .send(randomFile)
    .expect(200);

  t.is(body.value, "azertyuiop\n");
  t.is(body.filename, "toto.txt");
});

test("rawBodyParser / Content-MD5 value mismatch", async (t) => {
  const { body } = await request(createServer())
    .post("/")
    .set("Content-Type", "text/plain")
    .set("Content-MD5", "abced")
    .send(randomFile)
    .expect(400);

  t.deepEqual(body, {
    code: 400,
    message:
      "La valeur de l’en-tête Content-MD5 ne correspond pas à la signature MD5 du contenu soumis.",
  });
});

test("rawBodyParser / Content-MD5 value ok", async (t) => {
  const { body } = await request(createServer())
    .post("/")
    .set("Content-Type", "text/plain")
    .set("Content-MD5", randomFileMD5)
    .send(randomFile)
    .expect(200);

  t.is(body.value, "azertyuiop\n");
});

test("rawBodyParser / gzip + Content-MD5 value ok", async (t) => {
  const { body } = await request(createServer())
    .post("/")
    .set("Content-Type", "text/plain")
    .set("Content-MD5", randomFileGzMD5)
    .set("Content-Encoding", "gzip")
    .send(randomFileGz)
    .expect(200);

  t.is(body.value, "azertyuiop\n");
});
