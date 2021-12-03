
const {deburr, groupBy} = require('lodash')
const elus = require('../../../../elus.json')

const dateNaissanceIndex = groupBy(elus, 'dateNaissance')

function normalize(str) {
  return deburr(str).toUpperCase().replace(/[^A-Z]+/g, ' ')
}

function findMandats({dateNaissance, nomNaissance, nomMarital, prenom, sexe}) {
  const nNomNaissance = normalize(nomNaissance)
  const nPrenom = normalize(prenom)
  const elu = (dateNaissanceIndex[dateNaissance] || [])
    .find(c => c.sexe === sexe && normalize(c.nomNaissance) === nNomNaissance && nPrenom.startsWith(normalize(c.prenom)))

  if (!elu) {
    return
  }

  console.log('-- Correspondance identité FranceConnect et RNE --')
  console.log(`Date de naissance : ${dateNaissance}`)
  console.log(`Sexe : ${sexe}`)
  console.log(`Nom naissance : ${nomNaissance} (FranceConnect) - ${elu.nomNaissance} (RNE)`)
  console.log(`Nom marital : ${nomMarital} (FranceConnect) - ${elu.nomMarital} (RNE)`)
  console.log(`Prénom(s) : ${prenom} (FranceConnect) - ${elu.prenom} (RNE)`)

  return elu.mandats.filter(m => m.typeMandat === 'conseiller-municipal')
}

module.exports = {findMandats}
