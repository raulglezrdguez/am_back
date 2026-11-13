import admin from "firebase-admin";
import { FIREBASE_SERVICE_ACCOUNT, NODE_ENV } from "./index.ts";
import { logger, sanitizeError } from "../middlewares/logger.ts";

let initError: string | null = null;

if (NODE_ENV === "test") {
  // No inicializar Firebase en tests: evita red y credenciales reales.
} else if (!admin.apps.length) {
  if (!FIREBASE_SERVICE_ACCOUNT) {
    initError = "missing_service_account";
    logger.error("firebase_service_account_missing");
  } else {
    try {
      const json = Buffer.from(FIREBASE_SERVICE_ACCOUNT, "base64").toString(
        "utf8",
      );
      const serviceAccount = JSON.parse(json) as admin.ServiceAccount;
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (err) {
      initError = "invalid_service_account";
      logger.error(
        { err: sanitizeError(err) },
        "firebase_service_account_invalid",
      );
      // No matar la API: el JWT local sigue funcionando y readiness lo reporta.
    }
  }
}

export const isFirebaseInitialized = () => admin.apps.length > 0;
export const getFirebaseInitError = () => initError;

export default admin;
