import mongoose from "mongoose";

import Patient from "../models/patient.model.ts";
import User from "../models/user.model.ts";
import Stat from "../models/stat.model.ts";
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
import { phiSearchTruncatedTotal } from "../config/metrics.ts";
import { logger } from "../middlewares/logger.ts";

const USER_POPULATE = "id name email role status createdAt updatedAt";
const PATIENT_POPULATES = [
  { path: "owner", select: USER_POPULATE },
  { path: "sharedWith", select: "name email role status createdAt updatedAt" },
];
const NOT_DELETED = { deletedAt: null };
const PATIENT_SELECT =
  "_id identifier name birthDate sex address phone email emergencyContact medicalHistory allergies medications public owner sharedWith createdAt";

const OWNER_POPULATE = { path: "owner", select: USER_POPULATE };
const SHARED_POPULATE = { path: "sharedWith", select: USER_POPULATE };
export const PATIENT_SEARCH_MAX = 50;

type PatientSearchResult = {
  items: any[];
  truncated: boolean;
};

const patientPage = (rows: any[], limit: number): CursorPage<any> => {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    hasMore,
    nextCursor:
      hasMore && last?.createdAt
        ? encodeCursor(last.createdAt, String(last._id))
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
    ...NOT_DELETED,
    owner: ownerId,
    ...buildCursorFilter("createdAt", cursor),
  })
    .select(PATIENT_SELECT)
    .populate(OWNER_POPULATE)
    .populate(SHARED_POPULATE)
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
    ...NOT_DELETED,
    $and: [
      { sharedWith: userId },
      ...(cursor ? [buildCursorFilter("createdAt", cursor)] : []),
    ],
  })
    .select(PATIENT_SELECT)
    .populate(OWNER_POPULATE)
    .populate(SHARED_POPULATE)
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
    ...NOT_DELETED,
    $and: [
      { $or: [{ owner: userId }, { sharedWith: userId }] },
      ...(cursor ? [buildCursorFilter("createdAt", cursor)] : []),
    ],
  })
    .select(PATIENT_SELECT)
    .populate(OWNER_POPULATE)
    .populate(SHARED_POPULATE)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  return patientPage(rows, limit);
};

// Get patient by ID only if it belongs to the owner
export const getPatient = async (id: string, userId: string) =>
  await Patient.findOne({ ...NOT_DELETED, _id: id, owner: userId })
    .select(PATIENT_SELECT)
    .populate(OWNER_POPULATE)
    .populate(SHARED_POPULATE)
    .lean();

// Get patient by ID only if it is shared with the user
export const getSharedPatient = async (id: string, userId: string) =>
  await Patient.findOne({ ...NOT_DELETED, _id: id, sharedWith: userId })
    .select(PATIENT_SELECT)
    .populate(OWNER_POPULATE)
    .populate(SHARED_POPULATE)
    .lean();

// Get patient by ID only if it belongs to the owner or is shared with the user
export const getAllPatient = async (id: string, userId: string) =>
  await Patient.findOne({
    ...NOT_DELETED,
    _id: id,
    $or: [{ owner: userId }, { sharedWith: userId }],
  })
    .select(PATIENT_SELECT)
    .populate(OWNER_POPULATE)
    .populate(SHARED_POPULATE)
    .lean();

const runPatientSearch = async (
  filter: Record<string, unknown>,
  operation: string,
): Promise<PatientSearchResult> => {
  const rows = await Patient.find(filter)
    .select(PATIENT_SELECT)
    .populate(OWNER_POPULATE)
    .populate(SHARED_POPULATE)
    .sort({ _id: 1 })
    .limit(PATIENT_SEARCH_MAX + 1)
    .lean();

  const truncated = rows.length > PATIENT_SEARCH_MAX;

  if (truncated) {
    phiSearchTruncatedTotal.inc({ operation });
    logger.warn({ operation, max: PATIENT_SEARCH_MAX }, "phi_search_truncated");
  }

  return {
    items: truncated ? rows.slice(0, PATIENT_SEARCH_MAX) : rows,
    truncated,
  };
};

type Scope = "owner" | "sharedWith" | "both";

const buildPatientSearchFilter = (
  scope: Scope,
  identifier: string,
  name: string,
  userId: string,
): Record<string, unknown> => {
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

  const scopeFilter =
    scope === "owner"
      ? { owner: userId }
      : scope === "sharedWith"
        ? { sharedWith: userId }
        : { $or: [{ owner: userId }, { sharedWith: userId }] };

  return {
    ...NOT_DELETED,
    $and: [
      scopeFilter,
      ...(conditions.length > 0 ? [{ $or: conditions }] : []),
    ],
  };
};

// get patient by identifier or name
export const getPatientBy = (
  identifier: string,
  name: string,
  userId: string,
) =>
  runPatientSearch(
    buildPatientSearchFilter("owner", identifier, name, userId),
    "patientBy",
  );

// get shared patient by identifier or name
export const getSharedPatientBy = (
  identifier: string,
  name: string,
  userId: string,
) =>
  runPatientSearch(
    buildPatientSearchFilter("sharedWith", identifier, name, userId),
    "sharedPatientBy",
  );

// get all my patients by identifier or name
export const getAllPatientBy = (
  identifier: string,
  name: string,
  userId: string,
) =>
  runPatientSearch(
    buildPatientSearchFilter("both", identifier, name, userId),
    "allPatientBy",
  );

// Create a new patient
export const createPatient = async (
  input: CreatePatientInput & { owner: string },
) => {
  const patient = await Patient.create({ ...input });

  return await Patient.findById(patient._id)
    .select(PATIENT_SELECT)
    .populate(OWNER_POPULATE)
    .populate(SHARED_POPULATE)
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
    { ...NOT_DELETED, _id: id, owner: ownerId },
    sanitized,
    UPDATE_OPTS_WITH_SETTERS,
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
  const patient = await Patient.findOne({
    ...NOT_DELETED,
    _id: id,
    owner: ownerId,
  })
    .select(PATIENT_SELECT)
    .populate(OWNER_POPULATE)
    .populate(SHARED_POPULATE)
    .lean();

  if (!patient) throw new Error("Patient not found or not owned by you");

  const session = await mongoose.startSession();
  try {
    const deleted = await session.withTransaction(async () => {
      const statsCount = await Stat.countDocuments({ patient: id }).session(
        session,
      );
      if (statsCount > 0)
        throw new Error(
          `Cannot delete patient: ${statsCount} statistics reference it.`,
        );

      const patient = await Patient.findOneAndDelete({
        _id: id,
        owner: ownerId,
      })
        .session(session)
        .populate(OWNER_POPULATE)
        .populate(SHARED_POPULATE)
        .lean();
      if (!patient) throw new Error("Patient not found or not owned by you");
      return patient;
    });
    return deleted;
  } finally {
    await session.endSession();
  }
};

// Share a patient with another user (only owner can share)
export const sharePatient = async (
  id: string,
  ownerId: string,
  userId: string,
) => {
  const patient = await Patient.findOne({
    ...NOT_DELETED,
    _id: id,
    owner: ownerId,
  });
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
    .populate(OWNER_POPULATE)
    .populate(SHARED_POPULATE);

  return updated;
};

// delete shared access to a patient (only owner can delete)
export const deleteSharedPatient = async (
  id: string,
  ownerId: string,
  userId: string,
) => {
  const patient = await Patient.findOne({
    ...NOT_DELETED,
    _id: id,
    owner: ownerId,
  }).lean();
  if (!patient) throw new Error("Patient not found or not owned by you");

  return await Patient.findByIdAndUpdate(
    id,
    { $pull: { sharedWith: userId } },
    UPDATE_OPTS, // ← aunque sharedWith es ObjectId[], runValidators protege el cast
  )
    .select(PATIENT_SELECT)
    .populate(OWNER_POPULATE)
    .populate(SHARED_POPULATE);
};
