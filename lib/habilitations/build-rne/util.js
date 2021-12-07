function normalizeDate(dateOrigine) {
  if (!dateOrigine) {
    return undefined
  }

  const [jour, mois, annee] = dateOrigine.split('/')
  return `${annee}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`
}

module.exports = {normalizeDate}
