import mongoose from "mongoose";
import { MONGO_URI, IS_PRODUCTION } from "./index.ts";
import { logger, sanitizeError } from "../middlewares/logger.ts";
import { mongoReadyState } from "./metrics.ts";

let listenersRegistered = false;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;

  if (!MONGO_URI) {
    throw new Error("MONGO_URI is required to connect to the database");
  }

  if (IS_PRODUCTION && MONGO_URI.includes("127.0.0.1")) {
    throw new Error("Refusing to connect to localhost MongoDB in production");
  }

  // Si Mongo cae, las queries fallan rápido en lugar de quedar bufferizadas.
  mongoose.set("bufferCommands", false);

  if (!listenersRegistered) {
    listenersRegistered = true;

    mongoose.connection.on("connected", () => {
      mongoReadyState.set(1);
      logger.info("mongo_connected");
    });
    mongoose.connection.on("disconnected", () => {
      mongoReadyState.set(0);
      logger.warn("mongo_disconnected");
    });
    mongoose.connection.on("reconnected", () => {
      mongoReadyState.set(1);
      logger.info("mongo_reconnected");
    });
    mongoose.connection.on("error", (err) => {
      logger.error({ err: sanitizeError(err) }, "mongo_error");
    });

    mongoose.connection.on("close", () => {
      mongoReadyState.set(0);
      logger.warn("mongo_closed");
    });
  }

  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 20,
    minPoolSize: 2,
    heartbeatFrequencyMS: 10_000,
  });
};
