import mongoose from "mongoose";
import { MONGO_URI, IS_PRODUCTION } from "./index.ts";

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;

  // MONGO_URI ya fue validado al arrancar, pero refuerzo por si se llama aislado
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is required to connect to the database");
  }

  // En producción, el fallback a localhost está prohibido
  // (MONGO_URI ya es obligatorio gracias a Zod, así que este branch es defensivo)
  if (IS_PRODUCTION && MONGO_URI.includes("127.0.0.1")) {
    throw new Error("Refusing to connect to localhost MongoDB in production");
  }

  await mongoose.connect(MONGO_URI);
};
