import { asAuditId, auditResolvers } from "../audit.ts";
import { GraphQLError } from "graphql";
import * as statService from "../../services/stat.service.ts";
import type { CreateStatInput, StatFilterInput } from "../../types/stat.d.ts";

import { type ApolloContext } from "../../config/apollo.context.ts";
import { NotFoundError } from "../../services/stat.policy.ts";

export const toActor = (currentUser: ApolloContext["currentUser"]) => {
  if (!currentUser) {
    // Usa GraphQLError con extensions.code
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return { id: currentUser.id, role: currentUser.role };
};

const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof NotFoundError) {
      // Usa GraphQLError con extensions.code
      throw new GraphQLError(err.message, {
        extensions: { code: "NOT_FOUND" },
      });
    }
    throw err;
  }
};

const Query = {
  getStatById: (
    _: any,
    { id }: { id: string },
    { currentUser }: ApolloContext,
  ) => wrap(() => statService.getStatById(id, toActor(currentUser))),

  getStatsByPatient: {
    resolve: (_: any, { id }: { id: string }, { currentUser }: ApolloContext) =>
      wrap(
        async () =>
          (await statService.getStatsByPatient(id, toActor(currentUser))).items,
      ),
    extensions: { complexity: 5 },
  },

  getStatsByExam: {
    resolve: (_: any, { id }: { id: string }, { currentUser }: ApolloContext) =>
      wrap(
        async () =>
          (await statService.getStatsByExam(id, toActor(currentUser))).items,
      ),
    extensions: { complexity: 5 },
  },

  getStats: {
    resolve: (
      _: any,
      { filter }: { filter: StatFilterInput },
      { currentUser }: ApolloContext,
    ) =>
      wrap(
        async () =>
          (
            await statService.getStats(filter || {}, {
              actor: toActor(currentUser),
              limit: 50,
            })
          ).items,
      ),
    extensions: { complexity: 5 },
  },
};

const Mutation = {
  createStat: (
    _: any,
    { input }: { input: CreateStatInput },
    { currentUser }: ApolloContext,
  ) =>
    wrap(() =>
      statService.createStat(
        { ...input, authorId: currentUser!.id },
        toActor(currentUser),
      ),
    ),
};

export default {
  Query: auditResolvers(Query, {
    getStatById: {
      resourceType: "Stat",
      resourceId: (args) => asAuditId(args.id),
    },
    getStatsByPatient: {
      resourceType: "Patient",
      resourceId: (args) => asAuditId(args.id),
      metadata: (_args, result) => ({
        statCount: Array.isArray(result) ? result.length : 0,
      }),
    },
    getStatsByExam: {
      resourceType: "Exam",
      resourceId: (args) => asAuditId(args.id),
      metadata: (_args, result) => ({
        statCount: Array.isArray(result) ? result.length : 0,
      }),
    },
    getStats: {
      resourceType: "Stat",
      metadata: (args, result) => ({
        resultCount: Array.isArray(result) ? result.length : 0,
        filterExam: Boolean(args.filter?.examId),
        filterResult: Boolean(args.filter?.resultValue),
        filterAddress: Boolean(args.filter?.address),
        filterCompletedAt: Boolean(args.filter?.completedAt),
      }),
    },
  }),
  Mutation: auditResolvers(Mutation, {
    createStat: {
      resourceType: "Stat",
      resourceId: (_args, result) => asAuditId(result?._id?.toString()),
      metadata: (args) => ({
        patientId: asAuditId(args.input?.patientId),
        examId: asAuditId(args.input?.examId),
      }),
    },
  }),
};
