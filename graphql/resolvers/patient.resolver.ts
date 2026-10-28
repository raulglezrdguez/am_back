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

    sharedPatients: (_: any, __: any, { currentUser }: ApolloContext) => {
      if (!currentUser) return [];
      return patientService.listSharedPatients(currentUser.id);
    },

    allPatients: (_: any, __: any, { currentUser }: ApolloContext) => {
      if (!currentUser) return [];
      return patientService.listAllPatients(currentUser.id);
    },

    patient: (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) return null;

      return patientService.getPatient(id, currentUser.id);
    },

    sharedPatient: (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) return null;

      return patientService.getSharedPatient(id, currentUser.id);
    },

    allPatient: (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) return null;

      return patientService.getAllPatient(id, currentUser.id);
    },

    patientBy: (
      _: any,
      { name, identifier }: { name?: string; identifier?: string },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) return [];
      if (!identifier && !name) return [];
      return patientService.getPatientBy(
        identifier ?? "",
        name ?? "",
        currentUser.id,
      );
    },

    sharedPatientBy: (
      _: any,
      { name, identifier }: { name?: string; identifier?: string },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) return [];
      if (!identifier && !name) return [];
      return patientService.getSharedPatientBy(
        identifier ?? "",
        name ?? "",
        currentUser.id,
      );
    },

    allPatientBy: (
      _: any,
      { name, identifier }: { name?: string; identifier?: string },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) return [];
      if (!identifier && !name) return [];
      return patientService.getAllPatientBy(
        identifier ?? "",
        name ?? "",
        currentUser.id,
      );
    },
  },
  Mutation: {
    createPatient: (
      _: any,
      { input }: { input: CreatePatientInput },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) throw new Error("Authentication required");
      const patientInput = { ...input, owner: currentUser.id };
      return patientService.createPatient(patientInput);
    },

    updatePatient: async (
      _: any,
      { id, input }: { id: string; input: Partial<UpdatePatientInput> },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      const patient = await patientService.getPatient(id, currentUser.id);
      if (!patient) throw new Error("Patient not found");

      const ownerId =
        (patient.owner as any)._id?.toString() ?? patient.owner.toString();
      if (ownerId !== currentUser.id) {
        throw new Error("Only the owner can update this patient");
      }

      return patientService.updatePatient(id, currentUser.id, input);
    },

    deletePatient: async (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      const patient = await patientService.getPatient(id, currentUser.id);
      if (!patient) throw new Error("Patient not found");

      const ownerId =
        (patient.owner as any)._id?.toString() ?? patient.owner.toString();
      if (ownerId !== currentUser.id) {
        throw new Error("Only the owner can delete this patient");
      }

      return patientService.deletePatient(id, currentUser.id);
    },

    sharePatient: async (
      _: any,
      { id, userId }: { id: string; userId: string },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) throw new Error("Authentication required");
      return patientService.sharePatient(id, currentUser.id, userId);
    },

    deleteSharedPatient: async (
      _: any,
      { id, userId }: { id: string; userId: string },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) throw new Error("Authentication required");
      return patientService.deleteSharedPatient(id, currentUser.id, userId);
    },
  },
};
