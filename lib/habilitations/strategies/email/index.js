const randomNumber = require("random-number-csprng");
const Habilitation = require("../../model");
const mongo = require("../../../util/mongo");

const DEMO_MODE = process.env.DEMO_MODE === "1";

async function generatePinCode() {
  const number = await randomNumber(0, 999_999);
  return number.toString().padStart(6, "0");
}

function hasBeenSentRecently(sentAt) {
  const now = new Date();
  const floodLimitTime = new Date(sentAt);
  floodLimitTime.setMinutes(floodLimitTime.getMinutes() + 5);
  return now < floodLimitTime;
}

function getExpirationDate(startDate) {
  const expireAt = new Date(startDate);
  expireAt.setHours(expireAt.getHours() + 24);
  return expireAt;
}

async function pinCodeValidation(code, habilitation) {
  if (DEMO_MODE && code === "000000") {
    return { validated: true };
  }

  if (code !== habilitation.strategy.pinCode) {
    const { strategy } = await decreasesRemainingAttempts(habilitation._id);
    const { remainingAttempts } = strategy;

    if (remainingAttempts === 0) {
      await Habilitation.rejectHabilitation(habilitation._id);

      return {
        validated: false,
        error: "Code non valide. Demande rejetée.",
      };
    }

    const plural = remainingAttempts > 1 ? "s" : "";

    return {
      validated: false,
      error: `Code non valide, ${remainingAttempts} tentative${plural} restante${plural}`,
      remainingAttempts,
    };
  }

  const now = new Date();

  if (now > habilitation.strategy.pinCodeExpiration) {
    return {
      validated: false,
      error: "Code expiré",
    };
  }

  return { validated: true };
}

async function decreasesRemainingAttempts(habilitationId) {
  await mongo.db
    .collection("habilitations")
    .updateOne(
      { _id: habilitationId },
      { $inc: { "strategy.remainingAttempts": -1 } },
      { $set: { updatedAt: new Date() } },
    );

  return Habilitation.fetchHabilitation(habilitationId);
}

module.exports = {
  decreasesRemainingAttempts,
  pinCodeValidation,
  generatePinCode,
  hasBeenSentRecently,
  getExpirationDate,
};
