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
