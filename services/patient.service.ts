import Patient from "../models/patient.model.ts";
import User from "../models/user.model.ts";
import { UPDATE_OPTS, UPDATE_OPTS_WITH_SETTERS } from "./utils.ts";

import type {
  CreatePatientInput,
  UpdatePatientInput,
} from "../types/patient.d.ts";
import {
  escapeRegex,
  clampLimit,
  buildCursorFilter,
  encodeCursor,
  type CursorPage,
} from "./utils.ts";

const PATIENT_SELECT =
  "_id identifier name birthDate sex address phone email emergencyContact medicalHistory allergies medications owner sharedWith";
const PATIENT_POPULATES = [
  { path: "owner", select: "name email role status createdAt updatedAt" },
  { path: "sharedWith", select: "name email role status createdAt updatedAt" },
];

const patientPage = (rows: any[], limit: number): CursorPage<any> => {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items,
    hasMore,
    nextCursor: hasMore
      ? encodeCursor(
          items[items.length - 1].createdAt,
          String(items[items.length - 1]._id),
        )
      : null,
  };
};

// List only my patients
export const listPatients = async (
  ownerId: string,
  cursor?: string,
  limitInput?: number,
) => {
  const limit = clampLimit(limitInput);
  const rows = await Patient.find({
    owner: ownerId,
    ...buildCursorFilter("createdAt", cursor),
  })
    .select(PATIENT_SELECT)
    .populate("owner", "name")
    .populate("sharedWith", "name")
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  return patientPage(rows, limit);
};

// List my shared patients
export const listSharedPatients = async (
  userId: string,
  cursor?: string,
  limitInput?: number,
) => {
  const limit = clampLimit(limitInput);
  const rows = await Patient.find({
    $and: [
      { sharedWith: userId },
      ...(cursor ? [buildCursorFilter("createdAt", cursor)] : []),
    ],
  })
    .select(PATIENT_SELECT)
    .populate("owner", "name")
    .populate("sharedWith", "name")
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  return patientPage(rows, limit);
};

// list all patients
export const listAllPatients = async (
  userId: string,
  cursor?: string,
  limitInput?: number,
) => {
  const limit = clampLimit(limitInput);
  const rows = await Patient.find({
    $and: [
      { $or: [{ owner: userId }, { sharedWith: userId }] },
      ...(cursor ? [buildCursorFilter("createdAt", cursor)] : []),
    ],
  })
    .select(PATIENT_SELECT)
    .populate("owner", "name")
    .populate("sharedWith", "name")
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  return patientPage(rows, limit);
};

// Get patient by ID only if it belongs to the owner
export const getPatient = async (id: string, userId: string) =>
  await Patient.findOne({
    _id: id,
    owner: userId,
  })
    .select(PATIENT_SELECT)
    .populate("owner", "name")
    .populate("sharedWith", "name")
    .lean();

// Get patient by ID only if it is shared with the user
export const getSharedPatient = async (id: string, userId: string) =>
  await Patient.findOne({
    _id: id,
    sharedWith: userId,
  })
    .select(PATIENT_SELECT)
    .populate("owner", "name")
    .populate("sharedWith", "name")
    .lean();

// Get patient by ID only if it belongs to the owner or is shared with the user
export const getAllPatient = async (id: string, userId: string) =>
  await Patient.findOne({
    _id: id,
    $or: [{ owner: userId }, { sharedWith: userId }],
  })
    .select(PATIENT_SELECT)
    .populate("owner", "name")
    .populate("sharedWith", "name")
    .lean();

// get patient by identifier or name
export const getPatientBy = async (
  identifier: string,
  name: string,
  userId: string,
) => {
  const conditions: Record<string, unknown>[] = [];

  if (identifier) {
    conditions.push({
      identifier: { $regex: escapeRegex(identifier), $options: "i" },
    });
  }

  if (name) {
    conditions.push({
      name: { $regex: escapeRegex(name), $options: "i" },
    });
  }

  const filter: Record<string, unknown> = {
    $and: [
      { owner: userId },
      ...(conditions.length > 0 ? [{ $or: conditions }] : []),
    ],
  };

  return await Patient.find(filter)
    .select(PATIENT_SELECT)
    .populate("owner", "name")
    .populate("sharedWith", "name")
    .lean();
};

// get shared patient by identifier or name
export const getSharedPatientBy = async (
  identifier: string,
  name: string,
  userId: string,
) => {
  const conditions: Record<string, unknown>[] = [];

  if (identifier) {
    conditions.push({
      identifier: { $regex: escapeRegex(identifier), $options: "i" },
    });
  }

  if (name) {
    conditions.push({
      name: { $regex: escapeRegex(name), $options: "i" },
    });
  }

  const filter: Record<string, unknown> = {
    $and: [
      { sharedWith: userId },
      ...(conditions.length > 0 ? [{ $or: conditions }] : []),
    ],
  };

  return await Patient.find(filter)
    .select(PATIENT_SELECT)
    .populate("owner", "name")
    .populate("sharedWith", "name")
    .lean();
};

// get all my patients by identifier or name
export const getAllPatientBy = async (
  identifier: string,
  name: string,
  userId: string,
) => {
  const conditions: Record<string, unknown>[] = [];

  if (identifier) {
    conditions.push({
      identifier: { $regex: escapeRegex(identifier), $options: "i" },
    });
  }

  if (name) {
    conditions.push({
      name: { $regex: escapeRegex(name), $options: "i" },
    });
  }

  const filter: Record<string, unknown> = {
    $and: [
      { $or: [{ owner: userId }, { sharedWith: userId }] },
      ...(conditions.length > 0 ? [{ $or: conditions }] : []),
    ],
  };

  return await Patient.find(filter)
    .select(PATIENT_SELECT)
    .populate("owner", "name")
    .populate("sharedWith", "name")
    .lean();
};

// Create a new patient
export const createPatient = async (
  input: CreatePatientInput & { owner: string },
) => {
  const patient = await Patient.create({ ...input });

  return await Patient.findById(patient._id)
    .select(PATIENT_SELECT)
    .populate("owner", "name")
    .populate("sharedWith", "name")
    .lean();
};

// Update patient
export const updatePatient = async (
  id: string,
  ownerId: string,
  input: Partial<UpdatePatientInput>,
) => {
  // Sanitización explícita: solo campos permitidos (evita mass assignment).
  const sanitized: Partial<UpdatePatientInput> = {};
  const ALLOWED: (keyof UpdatePatientInput)[] = [
    "identifier",
    "name",
    "birthDate",
    "sex",
    "address",
    "phone",
    "email",
    "emergencyContact",
    "medicalHistory",
    "allergies",
    "medications",
  ];
  for (const key of ALLOWED) {
    if (input[key] !== undefined) (sanitized as any)[key] = input[key];
  }

  const patient = await Patient.findOneAndUpdate(
    { _id: id, owner: ownerId },
    sanitized,
    UPDATE_OPTS_WITH_SETTERS, // ← runValidators + runSettersOnQuery
  )
    .select(PATIENT_SELECT)
    .populate(PATIENT_POPULATES[0])
    .populate(PATIENT_POPULATES[1])
    .lean();

  if (!patient) throw new Error("Patient not found or not owned by you");
  return patient;
};

// Delete a patient
export const deletePatient = async (id: string, ownerId: string) => {
  const patient = await Patient.findOne({ _id: id, owner: ownerId })
    .select(PATIENT_SELECT)
    .populate("owner", "name")
    .populate("sharedWith", "name")
    .lean();

  if (!patient) throw new Error("Patient not found or not owned by you");

  await Patient.deleteOne({ _id: id });
  return patient;
};

// Share a patient with another user (only owner can share)
export const sharePatient = async (
  id: string,
  ownerId: string,
  userId: string,
) => {
  const patient = await Patient.findOne({ _id: id, owner: ownerId });
  if (!patient) throw new Error("Patient not found or not owned by you");

  if (patient.owner.toString() === userId) {
    throw new Error("Cannot share with yourself");
  }

  const userExists = await User.exists({ _id: userId });
  if (!userExists) throw new Error("User to share with not found");

  const updated = await Patient.findByIdAndUpdate(
    id,
    { $addToSet: { sharedWith: userId } },
    UPDATE_OPTS,
  )
    .select(PATIENT_SELECT)
    .populate("owner", "name")
    .populate("sharedWith", "name");

  return updated;
};

// delete shared access to a patient (only owner can delete)
export const deleteSharedPatient = async (
  id: string,
  ownerId: string,
  userId: string,
) => {
  const patient = await Patient.findOne({ _id: id, owner: ownerId }).lean();
  if (!patient) throw new Error("Patient not found or not owned by you");

  return await Patient.findByIdAndUpdate(
    id,
    { $pull: { sharedWith: userId } },
    UPDATE_OPTS, // ← aunque sharedWith es ObjectId[], runValidators protege el cast
  )
    .select(PATIENT_SELECT)
    .populate("owner", "name")
    .populate("sharedWith", "name");
};
