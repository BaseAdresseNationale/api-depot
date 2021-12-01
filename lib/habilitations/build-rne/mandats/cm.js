const {invert, chain, deburr} = require('lodash')

const codesCommunes = chain(require('@etalab/decoupage-administratif/data/communes.json'))
  .map('code')
  .uniq()
  .value()

const headersMapping = invert({
  codeCommune: 'Code de la commune',
  nomCommune: 'Libellé de la commune',
  libelleFonction: 'Libellé de fonction'
})

function getFonction(libelleFonction) {
  if (!libelleFonction) {
    return
  }

  const normalized = deburr(libelleFonction).toLowerCase()

  if (normalized.includes('adjoint')) {
    return 'adjoint-au-maire'
  }

  if (normalized === 'maire delegue') {
    return 'maire-delegue'
  }

  if (normalized === 'maire') {
    return 'maire'
  }
}

function prepare({codeCommune, nomCommune, libelleFonction}) {
  if (!codesCommunes.includes(codeCommune)) {
    console.log(`Code commune inconnu : ${codeCommune}`)
    return null
  }

  return {
    typeMandat: 'conseiller-municipal',
    codeCommune,
    nomCommune,
    fonction: getFonction(libelleFonction)
  }
}

module.exports = {headersMapping, prepare}
