import mongoose from "mongoose";
import {
  escapeRegex,
  clampLimit,
  buildCursorFilter,
  encodeCursor,
  type CursorPage,
} from "./utils.ts";
import Stat from "../models/stat.model.ts";
import Patient from "../models/patient.model.ts";
import Exam from "../models/exam.model.ts";
import type {
  CreateStatInput,
  StatAnswer,
  StatFilterInput,
  StatResult,
} from "../types/stat.d.ts";

import {
  NotFoundError,
  buildAuthorScope,
  type StatActor,
} from "./stat.policy.ts";
import { gqlError } from "../graphql/authz.ts";
import { notFound } from "../errors/appError.ts";

// Proyección mínima del examen: NO traer questions/expression
const populateExamMinimal = {
  path: "exam",
  select: "title subtitle year", // ← sin questions/expression
  populate: { path: "author", select: "name" },
};
const populateExamFull = {
  path: "exam",
  select: "title subtitle year author",
  populate: {
    path: "author",
    select: "name email role status createdAt updatedAt",
  },
};

const populatePatientMin = {
  path: "patient",
  select: "identifier name birthDate sex",
};
const populateAuthorFull = {
  path: "author",
  select: "id name email role status createdAt updatedAt",
};

const STAT_PROJECTION =
  "exam patient author completedAt result answers address createdAt";

export type StatListOptions = {
  actor: StatActor;
  limit?: number;
  cursor?: string;
};

const buildBaseScope = (actor: StatActor) => buildAuthorScope(actor);

function toCursorPage<T extends { _id: any; completedAt: Date }>(
  rows: T[],
  limit: number,
  cursorOf: (row: T) => string,
): CursorPage<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? cursorOf(items[items.length - 1]) : null;
  return { items, nextCursor, hasMore };
}

export const getStatById = async (id: string, actor: StatActor) => {
  const stat = await Stat.findOne({ _id: id, ...buildAuthorScope(actor) })
    .select(STAT_PROJECTION)
    .populate(populateExamFull)
    .populate(populatePatientMin)
    .populate(populateAuthorFull)
    .lean();
  return stat;
};

export const getStatsByPatient = async (
  id: string,
  actor: StatActor,
  options: StatListOptions = { actor },
): Promise<CursorPage<Record<string, any>>> => {
  const limit = clampLimit(options.limit);
  const filter = {
    patient: id,
    ...buildBaseScope(actor),
    ...buildCursorFilter("completedAt", options.cursor),
  };

  const items = await Stat.find(filter)
    .select(STAT_PROJECTION)
    .populate(populateExamMinimal)
    .populate(populatePatientMin)
    .populate(populateAuthorFull)
    .sort({ completedAt: -1, _id: -1 })
    .limit(limit + 1) // +1 para saber si hay siguiente
    .lean();

  return toCursorPage(items, limit, (s: any) =>
    encodeCursor(s.completedAt, String(s._id)),
  );
};

export const getStatsByExam = async (
  id: string,
  actor: StatActor,
  options: StatListOptions = { actor },
): Promise<CursorPage<Record<string, any>>> => {
  const limit = clampLimit(options.limit);
  const filter = {
    exam: id,
    ...buildBaseScope(actor),
    ...buildCursorFilter("completedAt", options.cursor),
  };

  const items = await Stat.find(filter)
    .select(STAT_PROJECTION)
    .populate(populateExamMinimal)
    .populate(populatePatientMin)
    .populate(populateAuthorFull)
    .sort({ completedAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  return toCursorPage(items, limit, (s: any) =>
    encodeCursor(s.completedAt, String(s._id)),
  );
};

// getStats (listado con filtros) con cursor
export const getStats = async (
  filter: StatFilterInput,
  options: StatListOptions,
): Promise<CursorPage<Record<string, any>>> => {
  const { actor } = options;
  const limit = clampLimit(options.limit);
  const mongoFilter: Record<string, any> = { ...buildAuthorScope(actor) };

  if (filter.examId) mongoFilter.exam = filter.examId;
  if (filter.resultValue) mongoFilter["result.value"] = filter.resultValue;
  if (filter.address) {
    mongoFilter.address = {
      $regex: escapeRegex(filter.address),
      $options: "i",
    };
  }
  if (filter.completedAt) {
    mongoFilter.completedAt = { $lte: new Date(filter.completedAt) };
  }

  Object.assign(mongoFilter, buildCursorFilter("completedAt", options.cursor));

  const items = await Stat.find(mongoFilter)
    .select(STAT_PROJECTION)
    .populate(populateExamMinimal)
    .populate(populateAuthorFull)
    .sort({ completedAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  return toCursorPage(items, limit, (s: any) =>
    encodeCursor(s.completedAt, String(s._id)),
  );
};

export const createStat = async (input: CreateStatInput, actor: StatActor) => {
  // Refuerzo: el authorId debe ser el del actor (o admin puede crear en nombre de otro si lo permites).
  if (!actor || (actor.role !== 0 && input.authorId !== actor.id)) {
    // Si prefieres que admin pueda crear para otros, quita esta rama.
    throw gqlError(notFound("Resource not found"));
  }

  const session = await mongoose.startSession();
  try {
    const created = await session.withTransaction(async () => {
      // Validaciones dentro de la transacción (lectura consistente)
      // El paciente debe pertenecer al actor (o ser compartido con él)
      // Admin: puede usar cualquiera.
      const patientFilter =
        actor.role === 0
          ? { _id: input.patientId }
          : {
              _id: input.patientId,
              $or: [{ owner: actor.id }, { sharedWith: actor.id }],
            };
      const patient = await Patient.findOne(patientFilter)
        .session(session)
        .lean();
      if (!patient) throw gqlError(notFound("Resource not found"));

      // El examen debe existir y ser accesible (público o del actor)
      const examFilter =
        actor.role === 0
          ? { _id: input.examId }
          : {
              _id: input.examId,
              $or: [{ public: true }, { author: actor.id }],
            };
      const exam = await Exam.findOne(examFilter).session(session).lean();
      if (!exam) throw gqlError(notFound("Resource not found"));

      const [doc] = await Stat.create(
        [
          {
            exam: input.examId,
            patient: input.patientId,
            author: input.authorId,
            completedAt: input.completedAt,
            result: {
              value: input.result.value,
              text: input.result.text,
            } as StatResult,
            answers: input.answers.map(
              (ans: StatAnswer) =>
                ({ id: ans.id, answer: ans.answer }) as StatAnswer,
            ),
            address: input.address,
          },
        ],
        { session },
      );

      // Releer populado dentro de la transacción
      return await Stat.findOne({ _id: doc._id, ...buildAuthorScope(actor) })
        .session(session)
        .populate(populateExamFull)
        .populate(populatePatientMin)
        .populate(populateAuthorFull)
        .lean();
    });
    if (!created) throw gqlError(notFound("Resource not found"));
    return created;
  } finally {
    await session.endSession();
  }
};
