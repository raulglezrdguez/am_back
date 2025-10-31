import Patient from "../models/patient.model.ts";
import type {
  CreatePatientInput,
  UpdatePatientInput,
} from "../types/patient.d.ts";

// List only my patients
export const listPatients = async (ownerId: string) =>
  await Patient.find({ owner: ownerId });

// Get patient by ID only if it belongs to the owner
export const getPatient = async (id: string, ownerId: string) =>
  await Patient.findOne({ _id: id, owner: ownerId });

// get patient by identifier or name (public only)
export const getPatientBy = async (identifier: string, name: string) => {
  if (identifier && name) {
    return await Patient.find({
      $or: [
        { identifier: { $regex: identifier, $options: "i" } },
        { name: { $regex: name, $options: "i" } },
      ],
      public: true,
    });
  } else if (identifier) {
    return await Patient.find({
      identifier: { $regex: identifier, $options: "i" },
      public: true,
    });
  } else if (name) {
    return await Patient.find({
      name: { $regex: name, $options: "i" },
      public: true,
    });
  } else
    return await Patient.find({
      public: true,
    });
};

// Create a new patient
export const createPatient = async (input: CreatePatientInput) => {
  const patient = await Patient.create({ ...input });

  return await Patient.findById(patient._id).populate("owner", "name email");
};

// Update patient
export const updatePatient = async (
  id: string,
  input: Partial<UpdatePatientInput>
) => {
  const patient = await Patient.findOne({ _id: id });
  if (!patient) throw new Error("Patient not found");

  return await Patient.findByIdAndUpdate(id, input, { new: true });
};

// Delete a patient
export const deletePatient = async (id: string) => {
  const patient = await Patient.findOne({ _id: id });
  if (!patient) throw new Error("Patient not found");

  return await Patient.findByIdAndDelete(id);
};
