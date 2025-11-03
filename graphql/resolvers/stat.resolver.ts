import * as statService from "../../services/stat.service.ts";
import type { CreateStatInput, StatFilter } from "../../types/stat.d.ts";

import { type ApolloContext } from "../../config/apollo.context.ts";

export default {
  Query: {
    getStatById: (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");
      return statService.getStatById(id);
    },

    getStatsByPatient: (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");
      return statService.getStatsByPatient(id);
    },

    getStatsByExam: (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");
      return statService.getStatsByExam(id);
    },

    getStats: (_: any, { filter }: { filter: StatFilter }) =>
      statService.getStats(filter),
  },

  Mutation: {
    createStat: (
      _: any,
      { input }: { input: CreateStatInput },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      const createStatInput = { ...input, authorId: currentUser.id };
      return statService.createStat(createStatInput);
    },
  },
};
