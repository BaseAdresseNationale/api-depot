const randomNumber = require('random-number-csprng')
const Habilitation = require('../../model')

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
    const {strategy} = await Habilitation.decreasesRemainingAttempts(habilitation._id)

    if (strategy.remainingAttempts === 0) {
      await Habilitation.rejectHabilitation()
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

module.exports = {pinCodeValidation, generatePinCode, hasBeenSentRecently, getExpirationDate}
