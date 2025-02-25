import admin from "firebase-admin";
import fs from "fs";

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const adminAuth = admin.auth();
