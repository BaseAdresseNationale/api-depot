const communes = require('@etalab/decoupage-administratif/data/communes.json')
  .filter(c => ['commune-actuelle', 'arrondissement-municipal'].includes(c.type))

const codesCommunes = new Set(communes.map(c => c.code))

function isCommuneActuelle(codeCommune) {
  return codesCommunes.has(codeCommune)
}

module.exports = {communes, isCommuneActuelle}
