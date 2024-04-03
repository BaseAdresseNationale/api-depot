const test = require("ava");
const { isCommuneActuelle } = require("../cog");

test("isCommuneActuelle", (t) => {
  t.is(isCommuneActuelle("57415"), true);
  t.is(isCommuneActuelle("57000"), false);
});
