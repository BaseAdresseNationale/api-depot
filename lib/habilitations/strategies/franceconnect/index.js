const { callbackify } = require("util");
const { Strategy } = require("passport-oauth2");
const got = require("got");
const { isAdmin } = require("./admins");
const { findMandats } = require("./rne");

function createFranceConnectStrategy() {
  const strategy = new Strategy(
    {
      authorizationURL: process.env.FC_SERVICE_URL + "/api/v1/authorize",
      tokenURL: process.env.FC_SERVICE_URL + "/api/v1/token",
      clientID: process.env.FC_FS_ID,
      clientSecret: process.env.FC_FS_SECRET,
      callbackURL: process.env.FC_FS_CALLBACK,
      state: "foobar",
      scope: ["openid", "profile"],
    },
    (accessToken, refreshToken, params, profile, done) => {
      profile.idToken = params.id_token;
      done(null, profile);
    },
  );

  strategy.authorizationParams = () => ({ nonce: "foobar" });

  strategy.userProfile = callbackify(async (accessToken) => {
    const gotOptions = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      responseType: "json",
    };
    const result = await got(
      process.env.FC_SERVICE_URL + "/api/v1/userinfo?schema=openid",
      gotOptions,
    );
    if (!result.body || !result.body.sub) {
      throw new Error("Profil non valide");
    }

    const user = {
      sub: result.body.sub,
      prenom: result.body.given_name,
      nomNaissance: result.body.family_name,
      nomMarital: result.body.preferred_username,
      sexe: result.body.gender === "male" ? "M" : "F",
      dateNaissance: result.body.birthdate,
    };

    user.isAdmin = isAdmin(user);
    user.mandats = findMandats(user);

    return user;
  });

  return strategy;
}

function getMandatCommune(user, codeCommune) {
  const { nomMarital, nomNaissance, prenom } = user;

  if (user.isAdmin) {
    return { nomMarital, nomNaissance, prenom, typeMandat: "administrateur" };
  }

  if (!user.mandats) {
    return;
  }

  const mandatCommune = user.mandats.find((m) => m.codeCommune === codeCommune);

  if (mandatCommune) {
    return {
      nomMarital,
      nomNaissance,
      prenom,
      typeMandat: mandatCommune.fonction || "conseiller-municipal",
    };
  }
}

module.exports = { createFranceConnectStrategy, getMandatCommune };
