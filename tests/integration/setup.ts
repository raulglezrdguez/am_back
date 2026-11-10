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

// import mongoose from "mongoose";
// import { MongoMemoryServer } from "mongodb-memory-server";

// let mongoServer: MongoMemoryServer;

// export async function connectTestDB() {
//   // Cierra la conexión si existe
//   if (mongoose.connection.readyState !== 0) {
//     await mongoose.disconnect();
//   }

//   // Arranca Mongo en memoria
//   mongoServer = await MongoMemoryServer.create();
//   const uri = mongoServer.getUri();

//   // Conecta
//   await mongoose.connect(uri);
// }

// export async function closeTestDB() {
//   // Cierra conexión y para Mongo en memoria
//   if (mongoServer) await mongoServer.stop();
//   await mongoose.disconnect();
// }
