const {invert} = require('lodash')
const {normalizeDate} = require('../util')

const headersMapping = invert({
  dateDebutMandat: 'Date de début du mandat',
  dateDebutFonction: 'Date de début de la fonction'
})

function prepare({dateDebutMandat, dateDebutFonction}) {
  return {
    dateDebutMandat: normalizeDate(dateDebutMandat),
    dateDebutFonction: normalizeDate(dateDebutFonction)
  }
}

module.exports = {headersMapping, prepare}
