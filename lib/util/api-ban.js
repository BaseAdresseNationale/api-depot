const process = require("process");
const got = require("got");

const BAN_API_URL =
  process.env.BAN_API_URL || "https://plateforme.adresse.data.gouv.fr/ban";
const BAN_API_TOKEN = process.env.BAN_API_TOKEN;

async function composeCommune(codeCommune) {
  return got
    .post(`${BAN_API_URL}/communes/${codeCommune}/compose`, {
      headers: {
        Authorization: `Token ${BAN_API_TOKEN}`,
      },
    })
    .json();
}

module.exports = { composeCommune };
