const admin = require("firebase-admin");

const serviceAccount = require("../.private/sharexam-f26e8-firebase-adminsdk-fbsvc-2baa2f0f48.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "sharexam-f26e8",
});

export default admin;
