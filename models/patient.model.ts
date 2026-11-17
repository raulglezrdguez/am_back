import mongoose from "mongoose";
import { isValidBirthDateDMY, formatBirthDate } from "../graphql/scalars.ts";

import {
  MAX_AGE_YEARS,
  isOlderThanMaxAge,
  isFutureDate,
  toUtcMidnight,
} from "../services/utils.ts";
import { badInput } from "../errors/appError.ts";

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
      validate: [
        {
          // 1) Formato / fecha de calendario válida
          validator(v: Date) {
            if (!v) return true;
            if (!(v instanceof Date) || isNaN(v.getTime())) return false;
            return isValidBirthDateDMY(formatBirthDate(v));
          },
          message: "birthDate must be a valid calendar date (dd-mm-yyyy)",
        },
        {
          // 2) No anterior a hoy - MAX_AGE_YEARS
          validator(v: Date) {
            return !isOlderThanMaxAge(v, MAX_AGE_YEARS);
          },
          message: `birthDate cannot be earlier than ${MAX_AGE_YEARS} years ago`,
        },
        {
          // 3) No futura (hoy es válido)
          validator(v: Date) {
            return !isFutureDate(v);
          },
          message: "birthDate cannot be in the future",
        },
      ],
      get(v: Date) {
        if (!v) return v;
        return formatBirthDate(v);
      },
      set(v: string | Date) {
        if (!v) return v;
        if (v instanceof Date) {
          if (isNaN(v.getTime())) throw badInput("Invalid input");
          return toUtcMidnight(v);
        }
        if (typeof v === "string" && isValidBirthDateDMY(v)) {
          const [d, m, y] = v.split("-").map(Number);
          // Construir directamente en UTC evita el desplazamiento de día
          return new Date(Date.UTC(y, m - 1, d));
        }
        throw badInput("Invalid input");
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
    owner: { type: ObjectId, ref: "User", required: true },
    sharedWith: { type: ObjectId, ref: "User", required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

patientSchema.index({ owner: 1, name: 1 }); // listados por dueño + búsqueda
patientSchema.index({ sharedWith: 1 }); // listados compartidos
patientSchema.index({ owner: 1, identifier: 1 }); // búsqueda por identificador

export default mongoose.model("Patient", patientSchema);
