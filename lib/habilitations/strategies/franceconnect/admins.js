const {deburr} = require('lodash')

let admins
try {
  admins = require('../../../../admins.json')
} catch {
  admins = []
}

function normalize(str) {
  return deburr(str).toUpperCase().replace(/[^A-Z]+/g, ' ')
}

function isAdmin({dateNaissance, nomNaissance, prenom, sexe}) {
  return admins
    .some(a => (
      a.sexe === sexe
      && normalize(a.nomNaissance) === normalize(nomNaissance)
      && normalize(a.prenom) === normalize(prenom)
      && dateNaissance === a.dateNaissance
    ))
}

module.exports = {isAdmin}
