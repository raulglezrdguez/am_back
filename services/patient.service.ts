import Patient from "../models/patient.model.ts";
import User from "../models/user.model.ts";

import type {
  CreatePatientInput,
  UpdatePatientInput,
} from "../types/patient.d.ts";
import { escapeRegex } from "./utils.ts";

const PATIENT_SELECT =
  "_id identifier name birthDate sex address phone email emergencyContact medicalHistory allergies medications owner sharedWith";

// List only my patients
export const listPatients = async (ownerId: string) =>
  await Patient.find({ owner: ownerId })
    .select(PATIENT_SELECT)
    .populate("owner", "name email")
    .populate("sharedWith", "name email");

// List my shared patients
export const listSharedPatients = async (userId: string) =>
  await Patient.find({ sharedWith: userId })
    .select(PATIENT_SELECT)
    .populate("owner", "name email")
    .populate("sharedWith", "name email");

// list all patients
export const listAllPatients = async (userId: string) =>
  await Patient.find({
    $or: [{ owner: userId }, { sharedWith: userId }],
  })
    .select(PATIENT_SELECT)
    .populate("owner", "name email")
    .populate("sharedWith", "name email");

// Get patient by ID only if it belongs to the owner
export const getPatient = async (id: string, userId: string) =>
  await Patient.findOne({
    _id: id,
    owner: userId,
  })
    .select(PATIENT_SELECT)
    .populate("owner", "name email")
    .populate("sharedWith", "name email");

// Get patient by ID only if it is shared with the user
export const getSharedPatient = async (id: string, userId: string) =>
  await Patient.findOne({
    _id: id,
    sharedWith: userId,
  })
    .select(PATIENT_SELECT)
    .populate("owner", "name email")
    .populate("sharedWith", "name email");

// Get patient by ID only if it belongs to the owner or is shared with the user
export const getAllPatient = async (id: string, userId: string) =>
  await Patient.findOne({
    _id: id,
    $or: [{ owner: userId }, { sharedWith: userId }],
  })
    .select(PATIENT_SELECT)
    .populate("owner", "name email")
    .populate("sharedWith", "name email");

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
    .populate("owner", "name email")
    .populate("sharedWith", "name email")
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
    .populate("owner", "name email")
    .populate("sharedWith", "name email")
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
    .populate("owner", "name email")
    .populate("sharedWith", "name email")
    .lean();
};

// Create a new patient
export const createPatient = async (
  input: CreatePatientInput & { owner: string },
) => {
  const patient = await Patient.create({ ...input });

  return await Patient.findById(patient._id)
    .select(PATIENT_SELECT)
    .populate("owner", "name email")
    .populate("sharedWith", "name email");
};

// Update patient
export const updatePatient = async (
  id: string,
  ownerId: string,
  input: Partial<UpdatePatientInput>,
) => {
  const {
    identifier,
    name,
    birthDate,
    sex,
    address,
    phone,
    email,
    emergencyContact,
    medicalHistory,
    allergies,
    medications,
  } = input;

  const sanitized = {
    identifier,
    name,
    birthDate,
    sex,
    address,
    phone,
    email,
    emergencyContact,
    medicalHistory,
    allergies,
    medications,
  };

  const patient = await Patient.findOneAndUpdate(
    { _id: id, owner: ownerId },
    sanitized,
    { new: true, runValidators: true },
  )
    .select(PATIENT_SELECT)
    .populate("owner", "name email")
    .populate("sharedWith", "name email");

  if (!patient) throw new Error("Patient not found or not owned by you");
  return patient;
};

// Delete a patient
export const deletePatient = async (id: string, ownerId: string) => {
  const patient = await Patient.findOne({ _id: id, owner: ownerId })
    .select(PATIENT_SELECT)
    .populate("owner", "name email")
    .populate("sharedWith", "name email");

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
    { new: true },
  )
    .select(PATIENT_SELECT)
    .populate("owner", "name email")
    .populate("sharedWith", "name email");

  return updated;
};

// delete shared access to a patient (only owner can delete)
export const deleteSharedPatient = async (
  id: string,
  ownerId: string,
  userId: string,
) => {
  const patient = await Patient.findOne({ _id: id, owner: ownerId });
  if (!patient) throw new Error("Patient not found or not owned by you");

  return await Patient.findByIdAndUpdate(
    id,
    { $pull: { sharedWith: userId } },
    { new: true },
  )
    .select(PATIENT_SELECT)
    .populate("owner", "name email")
    .populate("sharedWith", "name email");
};
