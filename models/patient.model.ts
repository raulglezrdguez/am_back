import mongoose from "mongoose";
import { BIRTHDATE_REGEX, formatBirthDate } from "../graphql/scalars.ts";

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const sexs = ["FEMALE", "MALE"];

const patientSchema = new Schema(
  {
    identifier: { type: String, required: true },
    name: { type: String, required: true },
    birthDate: {
      type: Date,
      required: false,
      validate: {
        validator(v: Date) {
          if (!v) return true; // permitimos vacío
          return BIRTHDATE_REGEX.test(formatBirthDate(v));
        },
        message: "birthDate must be a valid calendar date (dd-mm-yyyy)",
      },
      // al leer → string dd-mm-yyyy
      get(v: Date) {
        if (!v) return v;
        return formatBirthDate(v);
      },
      // al escribir → convertimos string dd-mm-yyyy | Date → Date
      set(v: string | Date) {
        if (!v) return v;
        if (v instanceof Date) return v;
        if (typeof v === "string" && BIRTHDATE_REGEX.test(v)) {
          const [d, m, y] = v.split("-").map(Number);
          return new Date(y, m - 1, d);
        }
        throw new Error("Invalid birthDate format");
      },
    },
    sex: { type: String, enum: sexs, required: false },
    address: { type: String, required: false },
    phone: { type: String, required: false },
    email: { type: String, required: false },
    emergencyContact: { type: String, required: false },
    medicalHistory: { type: String, required: false },
    allergies: { type: [String], required: false, default: [] },
    medications: { type: [String], required: false, default: [] },
    public: { type: Boolean, required: true, default: false },
    owner: { type: ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

patientSchema.index({ author: 1 });

export default mongoose.model("Patient", patientSchema);
