import mongoose from "mongoose";

const MONGO_URI =
  process.env.MONGO_TEST_URI ??
  "mongodb://localhost:27017/mongo-db-am-back-test?replicaSet=rs0";

export async function connectTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(MONGO_URI);
}

export async function closeTestDB() {
  await mongoose.disconnect();
}
