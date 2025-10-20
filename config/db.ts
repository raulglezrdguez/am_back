import mongoose from "mongoose";
import { MONGO_URI } from "./index.js";

export const connectDB = async () =>
  await mongoose.connect(MONGO_URI || "mongodb://127.0.0.1:27017/am_back");
