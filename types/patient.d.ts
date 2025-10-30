import { Sex } from "./patient_enums.ts";

export type CreatePatientInput = {
  identifier: string;
  name: string;
  birthDate?: string; // dd-mm-yyyy
  sex?: Sex;
  address?: string;
  phone?: string;
  email?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  allergies?: string[];
  medications?: string[];
  public?: boolean;
  owner: string; // User ID
};

export type UpdatePatientInput = {
  identifier?: string;
  name?: string;
  birthDate?: string; // dd-mm-yyyy
  sex?: Sex;
  address?: string;
  phone?: string;
  email?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  allergies?: string[];
  medications?: string[];
  public?: boolean;
};

export type PatientOutput = {
  id: string;
  identifier: string;
  name: string;
  birthDate?: string; // dd-mm-yyyy
  sex?: Sex;
  address?: string;
  phone?: string;
  email?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  allergies: string[];
  medications: string[];
  public: boolean;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
};
