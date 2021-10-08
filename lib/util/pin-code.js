const randomNumber = require('random-number-csprng')

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

function validatePinCode(codeA, codeB, expirationDate) {
  const now = new Date()
  return codeA === codeB && now < expirationDate
}

module.exports = {generatePinCode, hasBeenSentRecently, getExpirationDate, validatePinCode}
