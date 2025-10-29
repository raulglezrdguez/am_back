import * as patientService from "../../services/patient.service.ts";
import type {
  CreatePatientInput,
  UpdatePatientInput,
} from "../../types/patient.d.ts";
import { type ApolloContext } from "../../config/apollo.context.ts";

export default {
  Query: {
    patients: (_: any, __: any, { currentUser }: ApolloContext) => {
      if (!currentUser) return [];
      return patientService.listPatients(currentUser.id);
    },

    patient: (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) return null;

      return patientService.getPatient(id, currentUser.id);
    },

    patientBy: (
      _: any,
      { name, identifier }: { name: string; identifier: string }
    ) => {
      return patientService.getPatientBy(identifier, name);
    },
  },
  Mutation: {
    createPatient: (
      _: any,
      { input }: { input: CreatePatientInput },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");
      const patientInput = { ...input, owner: currentUser.id };
      return patientService.createPatient(patientInput);
    },

    updatePatient: async (
      _: any,
      { id, input }: { id: string; input: Partial<UpdatePatientInput> },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      const patient = await patientService.getPatient(id, currentUser.id);
      if (!patient) throw new Error("Patient not found");

      return patientService.updatePatient(id, input);
    },

    deletePatient: async (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      const patient = await patientService.getPatient(id, currentUser.id);
      if (!patient) throw new Error("Patient not found");

      return patientService.deletePatient(id);
    },
  },
};
