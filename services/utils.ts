import type { QueryOptions } from "mongoose";

// Escapa caracteres especiales de regex para tratarlos como texto literal
export const escapeRegex = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// utils.ts (añadir)
export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export const clampLimit = (limit?: number, max = MAX_PAGE_SIZE) =>
  Math.min(Math.max(limit ?? DEFAULT_PAGE_SIZE, 1), max);

/**
 * Codifica un cursor opaco a partir de { createdAt, _id }.
 * Se usa base64 para que el cliente no dependa del formato interno.
 */
export const encodeCursor = (createdAt: Date, id: string): string =>
  Buffer.from(`${createdAt.toISOString()}|${id}`, "utf8").toString("base64url");

export const decodeCursor = (
  cursor: string,
): { createdAt: Date; id: string } | null => {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const [iso, id] = raw.split("|");
    const createdAt = new Date(iso);
    if (isNaN(createdAt.getTime()) || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
};

/**
 * Construye el filtro de cursor para un campo de orden (típicamente createdAt)
 * y _id como tiebreaker (evita duplicados si createdAt se repite).
 */
export const buildCursorFilter = (
  field: string,
  cursor: string | undefined,
  direction: "desc" | "asc" = "desc",
): Record<string, unknown> => {
  if (!cursor) return {};
  const decoded = decodeCursor(cursor);
  if (!decoded) return {};
  const op = direction === "desc" ? "$lt" : "$gt";
  return {
    $or: [
      { [field]: { [op]: decoded.createdAt } },
      { [field]: decoded.createdAt, _id: { [op]: decoded.id } },
    ],
  };
};

/**
 * Opciones estándar para updates que SÍ deben validar.
 * - new: true           → devuelve el doc actualizado
 * - runValidators: true → ejecuta enum/validators/cast
 * - context: "query"    → valida con `this` de la query (necesario si los
 *                         validators usan `this` para comparar con otros campos)
 */
export const UPDATE_OPTS: QueryOptions = {
  new: true,
  runValidators: true,
  context: "query",
};

/**
 * Para updates de campos con setter (p. ej. birthDate), añadir
 * runSettersOnQuery: true para que el setter se ejecute en la query.
 */
export const UPDATE_OPTS_WITH_SETTERS: QueryOptions = {
  ...UPDATE_OPTS,
  runSettersOnQuery: true,
} as QueryOptions;

export const MAX_AGE_YEARS = 100;

/**
 * Devuelve el instante (medianoche UTC) que corresponde a "hace `years` años"
 * respecto a `now`. Se normaliza a medianoche UTC para comparar a nivel de día
 * y evitar falsos negativos por zona horaria / hora del día.
 */
export const yearsAgoUtcMidnight = (
  years: number,
  now: Date = new Date(),
): Date => {
  const d = new Date(
    Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()),
  );
  return d;
};

/**
 * Normaliza una fecha a medianoche UTC (año/mes/día en UTC).
 */
export const toUtcMidnight = (date: Date): Date =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

/**
 * true si `birthDate` es anterior a `hoy - maxYears` (a nivel de día, UTC).
 * `undefined`/`null` → false (no aplica la restricción).
 */
export const isOlderThanMaxAge = (
  birthDate: Date | null | undefined,
  maxYears = MAX_AGE_YEARS,
  now: Date = new Date(),
): boolean => {
  if (!birthDate) return false;
  if (!(birthDate instanceof Date) || isNaN(birthDate.getTime())) return false;
  const limit = yearsAgoUtcMidnight(maxYears, now);
  return toUtcMidnight(birthDate).getTime() < limit.getTime();
};

/**
 * true si `date` es estrictamente posterior a hoy (a nivel de día, UTC).
 * - `undefined`/`null` → false (no aplica).
 * - `Invalid Date` → false (deja que el validador de formato reporte el error).
 * - `date` = hoy → false (hoy no es futuro).
 */
export const isFutureDate = (
  date: Date | null | undefined,
  now: Date = new Date(),
): boolean => {
  if (!date) return false;
  if (!(date instanceof Date) || isNaN(date.getTime())) return false;
  const today = toUtcMidnight(now);
  return toUtcMidnight(date).getTime() > today.getTime();
};
