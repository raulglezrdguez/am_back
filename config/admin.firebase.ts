import admin from "firebase-admin";
import { FIREBASE_SERVICE_ACCOUNT } from "./index.ts";

let serviceAccount: admin.ServiceAccount;

try {
  const json = Buffer.from(FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8");
  serviceAccount = JSON.parse(json);
} catch (err) {
  console.error(
    "❌ FIREBASE_SERVICE_ACCOUNT is not valid base64-encoded JSON:",
    (err as Error).message,
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // projectId se infiere del service account; no lo hardcodees
});

export default admin;
