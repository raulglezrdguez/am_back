import mongoose from "mongoose";
import { MONGO_URI } from "./index.ts";

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return; // ya conectado

  await mongoose.connect(MONGO_URI || "mongodb://127.0.0.1:27017/am_back");
};
