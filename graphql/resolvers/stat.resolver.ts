import * as statService from "../../services/stat.service.ts";
import type { CreateStatInput, StatFilterInput } from "../../types/stat.d.ts";

import { type ApolloContext } from "../../config/apollo.context.ts";

export default {
  Query: {
    getStatById: (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) throw new Error("Authentication required");
      return statService.getStatById(id);
    },

    getStatsByPatient: (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) throw new Error("Authentication required");
      return statService.getStatsByPatient(id);
    },

    getStatsByExam: (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) throw new Error("Authentication required");
      return statService.getStatsByExam(id);
    },

    getStats: (
      _: any,
      { filter }: { filter: StatFilterInput },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) throw new Error("Authentication required");
      const isAdmin = currentUser.role === 0;
      return statService.getStats(filter || {}, {
        userId: currentUser.id,
        isAdmin,
        limit: 50,
        skip: 0,
      });
    },
  },

  Mutation: {
    createStat: (
      _: any,
      { input }: { input: CreateStatInput },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      const createStatInput = { ...input, authorId: currentUser.id };
      return statService.createStat(createStatInput);
    },
  },
};
