import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer;

export async function connectTestDB() {
  // Cierra la conexión si existe
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Arranca Mongo en memoria
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Conecta
  await mongoose.connect(uri);
}

export async function closeTestDB() {
  // Cierra conexión y para Mongo en memoria
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}
