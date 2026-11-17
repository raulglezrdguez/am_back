import * as diagramService from "../../services/diagram.service.ts";
import type {
  CreateDiagramInput,
  UpdateDiagramInput,
} from "../../types/diagram.d.ts";
import { type ApolloContext } from "../../config/apollo.context.ts";
import { forbidden, notFound, unauthenticated } from "../../errors/appError.ts";
import { gqlError } from "../authz.ts";

export default {
  Query: {
    myDiagrams: (_: any, __: any, { currentUser }: ApolloContext) => {
      if (!currentUser) {
        return { items: [], nextCursor: null, hasMore: false };
      }
      return diagramService.listDiagramsByAuthor(currentUser.id);
    },
    myDiagram: (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) return null;
      return diagramService.getDiagramByAuthorId(id, currentUser.id);
    },
    publicDiagrams: async () =>
      (await diagramService.listPublicDiagrams()).items,
    publicDiagram: (_: any, { id }: { id: string }) =>
      diagramService.getPublicDiagramById(id),
    rootDiagrams: async (_: any, __: any, { currentUser }: ApolloContext) => {
      if (!currentUser) return [];
      if (currentUser.role !== 0) return [];
      return (await diagramService.getAllDiagrams()).items;
    },
    rootDiagram: (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) return null;
      if (currentUser.role !== 0) return null;
      return diagramService.getDiagramById(id);
    },
  },
  Mutation: {
    createDiagram: (
      _: any,
      { input }: { input: CreateDiagramInput },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) throw gqlError(unauthenticated());
      const diagramInput = { ...input, author: currentUser.id };
      return diagramService.createDiagram(diagramInput);
    },
    updateDiagram: async (
      _: any,
      { id, input }: { id: string; input: Partial<UpdateDiagramInput> },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) throw gqlError(unauthenticated());

      const diagram = await diagramService.getDiagramByAuthorId(
        id,
        currentUser.id,
      );
      if (!diagram) throw gqlError(notFound("Resource not found"));

      return diagramService.updateDiagram(id, input);
    },
    deleteDiagram: async (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) throw gqlError(unauthenticated());

      const diagram = await diagramService.getDiagramById(id);
      if (!diagram) throw gqlError(notFound("Resource not found"));
      if (diagram.author._id.toString() !== currentUser.id)
        throw gqlError(forbidden("Not allowed"));

      return diagramService.deleteDiagram(id);
    },
    rootUpdateDiagram: async (
      _: any,
      { id, input }: { id: string; input: Partial<UpdateDiagramInput> },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) throw gqlError(unauthenticated());

      if (currentUser.role !== 0) throw gqlError(forbidden("Not allowed"));

      const diagram = await diagramService.getDiagramById(id);
      if (!diagram) throw gqlError(notFound("Resource not found"));

      return diagramService.updateDiagram(id, input);
    },
    rootDeleteDiagram: async (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext,
    ) => {
      if (!currentUser) throw gqlError(unauthenticated());

      if (currentUser.role !== 0) throw gqlError(forbidden("Not allowed"));

      const diagram = await diagramService.getDiagramById(id);
      if (!diagram) throw gqlError(notFound("Resource not found"));

      return diagramService.deleteDiagram(id);
    },
  },
};
