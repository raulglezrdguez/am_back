import Diagram from "../models/diagram.model.ts";
import mongoose from "mongoose";
import { UPDATE_OPTS } from "./utils.ts";

import {
  clampLimit,
  buildCursorFilter,
  encodeCursor,
  type CursorPage,
} from "./utils.ts";
import type {
  CreateDiagramInput,
  UpdateDiagramInput,
} from "../types/diagram.d.ts";

const DIAGRAM_LIST_PROJECTION =
  "_id title description author public createdAt updatedAt"; // ← sin nodes/edges/result
const AUTHOR_POPULATE = "id name email role status createdAt updatedAt";

// Solo para findDiagramsByNode*: el test necesita leer nodes[0]
const DIAGRAM_NODE_SEARCH_PROJECTION = `${DIAGRAM_LIST_PROJECTION} nodes`;

const toDiagramPage = (rows: any[], limit: number): CursorPage<any> => {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? encodeCursor(
        items[items.length - 1].createdAt,
        String(items[items.length - 1]._id),
      )
    : null;
  return { items, nextCursor, hasMore };
};

export const listDiagramsByAuthor = async (
  authorId: string,
  cursor?: string,
  limitInput?: number,
) => {
  const limit = clampLimit(limitInput);
  const rows = await Diagram.find({
    author: authorId,
    ...buildCursorFilter("createdAt", cursor),
  })
    .select(DIAGRAM_LIST_PROJECTION)
    .populate("author", AUTHOR_POPULATE)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  return toDiagramPage(rows, limit);
};

export const listPublicDiagrams = async (
  cursor?: string,
  limitInput?: number,
) => {
  const limit = clampLimit(limitInput);
  const rows = await Diagram.find({
    public: true,
    ...buildCursorFilter("createdAt", cursor),
  })
    .select(DIAGRAM_LIST_PROJECTION)
    .populate("author", AUTHOR_POPULATE)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  return toDiagramPage(rows, limit);
};

export const getDiagramByAuthorId = async (id: string, authorId: string) => {
  const diagram = await Diagram.findOne({ _id: id })
    .populate("author", AUTHOR_POPULATE)
    .lean();
  if (diagram && String((diagram.author as any)._id) === authorId) {
    return diagram;
  }
  return null;
};

export const getPublicDiagramById = async (id: string) => {
  return await Diagram.findOne({ _id: id, public: true })
    .populate("author", AUTHOR_POPULATE)
    .lean();
};

export const getAllDiagrams = async (cursor?: string, limitInput?: number) => {
  const limit = clampLimit(limitInput);
  const rows = await Diagram.find({ ...buildCursorFilter("createdAt", cursor) })
    .select(DIAGRAM_LIST_PROJECTION)
    .populate("author", AUTHOR_POPULATE)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  return toDiagramPage(rows, limit);
};

export const getDiagramById = async (id: string) => {
  return await Diagram.findOne({ _id: id })
    .populate("author", AUTHOR_POPULATE)
    .lean();
};

export const createDiagram = async (input: CreateDiagramInput) => {
  const diagramInput = {
    ...input,
    author: new mongoose.Types.ObjectId(input.author),
  };
  const diagram = await Diagram.create(diagramInput);
  return diagram.populate("author", AUTHOR_POPULATE);
};

export const updateDiagram = async (id: string, input: UpdateDiagramInput) => {
  const diagram = await Diagram.findByIdAndUpdate(id, input, UPDATE_OPTS);
  return diagram?.populate("author", AUTHOR_POPULATE);
};

export const deleteDiagram = async (id: string) => {
  const diagram = await Diagram.findByIdAndDelete(id);
  return diagram?.populate("author", AUTHOR_POPULATE);
};

export const findDiagramsByNodeType = async (
  nodeType: string,
  limitInput?: number,
) => {
  const limit = clampLimit(limitInput);
  return await Diagram.find({
    public: true,
    nodes: {
      $elemMatch: {
        type: nodeType,
      },
    },
  })
    .select(DIAGRAM_NODE_SEARCH_PROJECTION)
    .populate("author", AUTHOR_POPULATE)
    .limit(limit)
    .lean();
};

export const findDiagramsByNodeLabel = async (
  nodeLabel: string,
  limitInput?: number,
) => {
  const limit = clampLimit(limitInput);
  return await Diagram.find({
    public: true,
    nodes: {
      $elemMatch: { "data.label": nodeLabel },
    },
  })
    .select(DIAGRAM_NODE_SEARCH_PROJECTION)
    .populate("author", AUTHOR_POPULATE)
    .limit(limit)
    .lean();
};

export const findDiagramsByNodeTypeAndLabel = async (
  nodeType: string,
  nodeLabel: string,
  limitInput?: number,
) => {
  const limit = clampLimit(limitInput);
  return await Diagram.find({
    public: true,
    nodes: {
      $elemMatch: {
        type: nodeType,
        "data.label": nodeLabel,
      },
    },
  })
    .select(DIAGRAM_NODE_SEARCH_PROJECTION)
    .populate("author", AUTHOR_POPULATE)
    .limit(limit)
    .lean();
};
