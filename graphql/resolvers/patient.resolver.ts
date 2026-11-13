import { asAuditId, auditResolvers } from "../audit.ts";
import * as patientService from "../../services/patient.service.ts";
import type {
  CreatePatientInput,
  UpdatePatientInput,
} from "../../types/patient.d.ts";
import { type ApolloContext } from "../../config/apollo.context.ts";
import { GraphQLError } from "graphql";

const SEARCH_TERM_MAX = 64;

const assertSearchTerm = (value?: string) => {
  if (value && value.length > SEARCH_TERM_MAX) {
    throw new GraphQLError("Invalid search term", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
};

const Query = {
  patients: async (_: any, __: any, { currentUser }: ApolloContext) => {
    if (!currentUser) return [];
    return (await patientService.listPatients(currentUser.id)).items;
  },
  sharedPatients: async (_: any, __: any, { currentUser }: ApolloContext) => {
    if (!currentUser) return [];
    return (await patientService.listSharedPatients(currentUser.id)).items;
  },
  allPatients: async (_: any, __: any, { currentUser }: ApolloContext) => {
    if (!currentUser) return [];
    return (await patientService.listAllPatients(currentUser.id)).items;
  },
  patient: (_: any, { id }: { id: string }, { currentUser }: ApolloContext) => {
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
  patientBy: async (
    _: any,
    { name, identifier }: { name?: string; identifier?: string },
    { currentUser }: ApolloContext,
  ) => {
    if (!currentUser) return [];
    assertSearchTerm(identifier);
    assertSearchTerm(name);
    if (!identifier && !name) return []; // evita dump por ausencia de filtro
    const { items } = await patientService.getPatientBy(
      identifier ?? "",
      name ?? "",
      currentUser.id,
    );
    return items;
  },

  sharedPatientBy: async (
    _: any,
    { name, identifier }: { name?: string; identifier?: string },
    { currentUser }: ApolloContext,
  ) => {
    if (!currentUser) return [];
    assertSearchTerm(identifier);
    assertSearchTerm(name);
    if (!identifier && !name) return [];
    const { items } = await patientService.getSharedPatientBy(
      identifier ?? "",
      name ?? "",
      currentUser.id,
    );
    return items;
  },
  allPatientBy: async (
    _: any,
    { name, identifier }: { name?: string; identifier?: string },
    { currentUser }: ApolloContext,
  ) => {
    if (!currentUser) return [];
    assertSearchTerm(identifier);
    assertSearchTerm(name);
    if (!identifier && !name) return [];
    const { items } = await patientService.getAllPatientBy(
      identifier ?? "",
      name ?? "",
      currentUser.id,
    );
    return items;
  },
};

const Mutation = {
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
};

export default {
  Query: auditResolvers(Query, {
    patients: {
      resourceType: "Patient",
      metadata: (_args, result) => ({
        resultCount: Array.isArray(result) ? result.length : 0,
      }),
    },
    sharedPatients: {
      resourceType: "Patient",
      metadata: (_args, result) => ({
        resultCount: Array.isArray(result) ? result.length : 0,
      }),
    },
    allPatients: {
      resourceType: "Patient",
      metadata: (_args, result) => ({
        resultCount: Array.isArray(result) ? result.length : 0,
      }),
    },
    patient: {
      resourceType: "Patient",
      resourceId: (args) => asAuditId(args.id),
    },
    sharedPatient: {
      resourceType: "Patient",
      resourceId: (args) => asAuditId(args.id),
    },
    allPatient: {
      resourceType: "Patient",
      resourceId: (args) => asAuditId(args.id),
    },
    patientBy: {
      resourceType: "Patient",
      metadata: (args, result) => ({
        hasName: Boolean(args.name),
        hasIdentifier: Boolean(args.identifier),
        resultCount: Array.isArray(result) ? result.length : 0,
        truncated:
          Array.isArray(result) &&
          result.length >= patientService.PATIENT_SEARCH_MAX,
      }),
    },
    sharedPatientBy: {
      resourceType: "Patient",
      metadata: (args, result) => ({
        hasName: Boolean(args.name),
        hasIdentifier: Boolean(args.identifier),
        resultCount: Array.isArray(result) ? result.length : 0,
      }),
    },
    allPatientBy: {
      resourceType: "Patient",
      metadata: (args, result) => ({
        hasName: Boolean(args.name),
        hasIdentifier: Boolean(args.identifier),
        resultCount: Array.isArray(result) ? result.length : 0,
      }),
    },
  }),
  Mutation: auditResolvers(Mutation, {
    createPatient: {
      resourceType: "Patient",
      resourceId: (_args, result) => asAuditId(result?._id?.toString()),
    },
    updatePatient: {
      resourceType: "Patient",
      resourceId: (args) => asAuditId(args.id),
      metadata: (args) => ({
        fieldCount: Object.keys(args.input ?? {}).length,
      }),
    },
    deletePatient: {
      resourceType: "Patient",
      resourceId: (args) => asAuditId(args.id),
    },
    sharePatient: {
      resourceType: "Patient",
      resourceId: (args) => asAuditId(args.id),
      metadata: (args) => ({ targetUserId: asAuditId(args.userId) }),
    },
    deleteSharedPatient: {
      resourceType: "Patient",
      resourceId: (args) => asAuditId(args.id),
      metadata: (args) => ({ targetUserId: asAuditId(args.userId) }),
    },
  }),
};
