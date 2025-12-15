import * as diagramService from "../../services/diagram.service.ts";
import type {
  CreateDiagramInput,
  UpdateDiagramInput,
} from "../../types/diagram.d.ts";
import { type ApolloContext } from "../../config/apollo.context.ts";

export default {
  Query: {
    myDiagrams: (_: any, __: any, { currentUser }: ApolloContext) => {
      if (!currentUser) return [];
      return diagramService.listDiagramsByAuthor(currentUser.id);
    },
    myDiagram: (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) return null;
      return diagramService.getDiagramByAuthorId(id, currentUser.id);
    },
    publicDiagrams: () => diagramService.listPublicDiagrams(),
    publicDiagram: (_: any, { id }: { id: string }) =>
      diagramService.getPublicDiagramById(id),
    rootDiagrams: (_: any, __: any, { currentUser }: ApolloContext) => {
      if (!currentUser) return [];
      if (currentUser.role !== 0) return [];
      return diagramService.getAllDiagrams();
    },
    rootDiagram: (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext
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
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");
      const diagramInput = { ...input, author: currentUser.id };
      return diagramService.createDiagram(diagramInput);
    },
    updateDiagram: async (
      _: any,
      { id, input }: { id: string; input: Partial<UpdateDiagramInput> },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      const diagram = await diagramService.getDiagramByAuthorId(
        id,
        currentUser.id
      );
      if (!diagram) throw new Error("Diagram not found");

      return diagramService.updateDiagram(id, input);
    },
    deleteDiagram: async (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      const diagram = await diagramService.getDiagramByAuthorId(
        id,
        currentUser.id
      );
      if (!diagram) throw new Error("Diagram not found");

      return diagramService.deleteDiagram(id);
    },
    rootUpdateDiagram: async (
      _: any,
      { id, input }: { id: string; input: Partial<UpdateDiagramInput> },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      if (currentUser.role !== 0)
        throw new Error("Not authorized to update diagram");

      const diagram = await diagramService.getDiagramById(id);
      if (!diagram) throw new Error("Diagram not found");

      return diagramService.updateDiagram(id, input);
    },
    rootDeleteDiagram: async (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      if (currentUser.role !== 0)
        throw new Error("Not authorized to delete diagram");

      const diagram = await diagramService.getDiagramById(id);
      if (!diagram) throw new Error("Diagram not found");

      return diagramService.deleteDiagram(id);
    },
  },
};
