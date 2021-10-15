const got = require('got')
const randomNumber = require('random-number-csprng')
const {deburr} = require('lodash')
const {decreasesRemainingAttempts, rejectHabilitation} = require('../model')

function normalize(str) {
  return deburr(str).toLowerCase()
}

const API_ETABLISSEMENTS_PUBLICS = process.env.API_ETABLISSEMENTS_PUBLICS || 'https://etablissements-publics.api.gouv.fr/v3'

function validateEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[(?:\d{1,3}\.){3}\d{1,3}])|(([a-zA-Z\-\d]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}

async function getCommuneEmail(codeCommune) {
  try {
    const response = await got(`${API_ETABLISSEMENTS_PUBLICS}/communes/${codeCommune}/mairie`, {responseType: 'json'})
    const mairie = response.body.features
      .find(m => !normalize(m.properties.nom).includes('deleguee'))

    const {email} = mairie.properties
    if (validateEmail(email)) {
      return email
    }

    throw new Error(`L’adresse email " ${email} " ne peut pas être utilisée`)
  } catch (error) {
    console.log(`Une erreur s’est produite lors de la récupération de l’adresse email de la mairie (Code commune: ${codeCommune}).`, error)
  }
}

async function generatePinCode() {
  return (await randomNumber(0, 999999)).toString().padStart(6, '0')
}

function hasBeenSentRecently(sentAt) {
  const now = new Date()
  const floodLimitTime = new Date(sentAt)
  floodLimitTime.setMinutes(floodLimitTime.getMinutes() + 5)
  return now < floodLimitTime
}

function getExpirationDate(startDate) {
  const expireAt = new Date(startDate)
  expireAt.setHours(expireAt.getHours() + 24)
  return expireAt
}

async function pinCodeValidation(code, habilitation) {
  if (code !== habilitation.strategy.pinCode) {
    const {strategy} = await decreasesRemainingAttempts(habilitation._id)

    if (strategy.remainingAttempts === 0) {
      await rejectHabilitation()
      return {validated: false, error: 'Code non valide, demande d’habilitation rejetée'}
    }

    const plural = strategy.remainingAttempts > 1 ? 's' : ''
    return {validated: false, error: `Code non valide, ${strategy.remainingAttempts} tentative${plural} retestante${plural}`}
  }

  const now = new Date()
  if (now > habilitation.strategy.pinCodeExpiration) {
    return {validated: false, error: 'Code expiré'}
  }

  return {validated: true}
}

module.exports = {getCommuneEmail, pinCodeValidation, generatePinCode, hasBeenSentRecently, getExpirationDate}
