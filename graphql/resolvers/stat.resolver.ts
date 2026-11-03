import { GraphQLError } from "graphql";
import * as statService from "../../services/stat.service.ts";
import type { CreateStatInput, StatFilterInput } from "../../types/stat.d.ts";

import { type ApolloContext } from "../../config/apollo.context.ts";
import { NotFoundError } from "../../services/stat.policy.ts";

const toActor = (currentUser: ApolloContext["currentUser"]) => {
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

export default {
  Query: {
    getStatById: (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext,
    ) => wrap(() => statService.getStatById(id, toActor(currentUser))),

    getStatsByPatient: {
      resolve: (
        _: any,
        { id }: { id: string },
        { currentUser }: ApolloContext,
      ) => wrap(() => statService.getStatsByPatient(id, toActor(currentUser))),
      extensions: { complexity: 5 },
    },

    getStatsByExam: {
      resolve: (
        _: any,
        { id }: { id: string },
        { currentUser }: ApolloContext,
      ) => wrap(() => statService.getStatsByExam(id, toActor(currentUser))),
      extensions: { complexity: 5 },
    },

    getStats: {
      resolve: (
        _: any,
        { filter }: { filter: StatFilterInput },
        { currentUser }: ApolloContext,
      ) =>
        wrap(() =>
          statService.getStats(filter || {}, {
            actor: toActor(currentUser),
            limit: 50,
            skip: 0,
          }),
        ),
      extensions: { complexity: 5 },
    },
  },

  Mutation: {
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
  },
};
