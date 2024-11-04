import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();

export const setSuperUserClaim = functions.https.onRequest(
  async (_request, response) => {
    // Replace with your superuser's email
    const email = "luisc.herreras@gmail.com";
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(user.uid, {superuser: true});
      logger.info(`Superuser set for ${email}`, {structuredData: true});
      response.status(200).send(`Superuser claim set for ${email}`);
    } catch (error: unknown) {
      logger.error("Error setting superuser claim:", error);
      response.status(500).send(`Error: ${errorToString(error)}`);
    }
  }
);

/**
 * Converts an error to a string representation.
 * @param {unknown} error - The error to be converted.
 * @return {string} The string representation of the error.
 */
function errorToString(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
