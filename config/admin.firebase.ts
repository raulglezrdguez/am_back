import admin from "firebase-admin";
import { readFileSync } from "fs";

// import serviceAccount from "../.private/sharexam-f26e8-firebase-adminsdk-fbsvc-2baa2f0f48.json" with { type: 'json' };
const serviceAccount = JSON.parse(
  readFileSync(
    new URL(
      "../.private/sharexam-f26e8-firebase-adminsdk-fbsvc-2baa2f0f48.json",
      import.meta.url
    ),
    "utf-8"
  )
) as admin.ServiceAccount;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "sharexam-f26e8",
});

export default admin;
