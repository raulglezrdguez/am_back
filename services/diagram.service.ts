import Diagram from "../models/diagram.model.ts";
import mongoose from "mongoose";

import type {
  CreateDiagramInput,
  UpdateDiagramInput,
} from "../types/diagram.d.ts";

export const listDiagramsByAuthor = async (authorId: string) =>
  await Diagram.find({ author: authorId }).populate("author", "name email");

export const listPublicDiagrams = async () =>
  await Diagram.find({ public: true }).populate("author", "name email");

export const getDiagramByAuthorId = async (id: string, authorId: string) => {
  const diagram = await Diagram.findOne({ _id: id }).populate(
    "author",
    "name email"
  );
  if (diagram && diagram.author.id.toString() === authorId) {
    return diagram;
  }
  return null;
};

export const getPublicDiagramById = async (id: string) => {
  return await Diagram.findOne({ _id: id, public: true }).populate(
    "author",
    "name email"
  );
};

export const getAllDiagrams = async () => {
  return await Diagram.find().populate("author", "name email");
};

export const getDiagramById = async (id: string) => {
  return await Diagram.findOne({ _id: id }).populate("author", "name email");
};

export const createDiagram = async (input: CreateDiagramInput) => {
  const diagramInput = {
    ...input,
    author: new mongoose.Types.ObjectId(input.author),
  };
  const diagram = await Diagram.create(diagramInput);
  return diagram.populate("author", "name email");
};

export const updateDiagram = async (id: string, input: UpdateDiagramInput) => {
  const diagram = await Diagram.findByIdAndUpdate(id, input, { new: true });
  return diagram?.populate("author", "name email");
};

export const deleteDiagram = async (id: string) => {
  const diagram = await Diagram.findByIdAndDelete(id);
  return diagram?.populate("author", "name email");
};

export const findDiagramsByNodeType = async (nodeType: string) => {
  return await Diagram.find({
    public: true,
    nodes: {
      $elemMatch: {
        type: nodeType,
      },
    },
  }).populate("author", "name email");
};

export const findDiagramsByNodeLabel = async (nodeLabel: string) => {
  return await Diagram.find({
    public: true,
    nodes: {
      $elemMatch: { "data.label": nodeLabel },
    },
  }).populate("author", "name email");
};

export const findDiagramsByNodeTypeAndLabel = async (
  nodeType: string,
  nodeLabel: string
) => {
  return await Diagram.find({
    public: true,
    nodes: {
      $elemMatch: {
        type: nodeType,
        "data.label": nodeLabel,
      },
    },
  }).populate("author", "name email");
};
