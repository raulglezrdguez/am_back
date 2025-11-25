import admin from "firebase-admin";
import { readFileSync } from "fs";

// import serviceAccount from "../.private/sharexam-f26e8-firebase-adminsdk-fbsvc-2baa2f0f48.json" with { type: 'json' };
// const serviceAccount = JSON.parse(
//   readFileSync(
//     new URL(
//       "../.private/sharexam-f26e8-firebase-adminsdk-fbsvc-2baa2f0f48.json",
//       import.meta.url
//     ),
//     "utf-8"
//   )
// ) as admin.ServiceAccount;
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccountJson = Buffer.from(
    process.env.FIREBASE_SERVICE_ACCOUNT,
    "base64"
  ).toString("utf8");
  serviceAccount = JSON.parse(serviceAccountJson);
} else {
  serviceAccount = JSON.parse(
    readFileSync(
      new URL(
        "../.private/sharexam-f26e8-firebase-adminsdk-fbsvc-2baa2f0f48.json",
        import.meta.url
      ),
      "utf-8"
    )
  ) as admin.ServiceAccount;
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "sharexam-f26e8",
});

export default admin;
