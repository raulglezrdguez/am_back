export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export type StatActor = {
  id: string;
  role: number;
};

export const isAdmin = (user: StatActor) => user.role === 0;

/**
 * Devuelve el filtro de autorización que se debe AND-ear con el filtro real.
 * - Admin: {} (sin restricción)
 * - Usuario normal: { author: user.id }
 */
export const buildAuthorScope = (user: StatActor): Record<string, unknown> =>
  isAdmin(user) ? {} : { author: user.id };

/**
 * Valida que un stat ya cargado pertenezca al usuario (o que sea admin).
 * Se usa cuando ya tenemos el documento en memoria.
 */
export const canReadStat = (user: StatActor, stat: { author: any } | null) => {
  if (!stat) return false;
  if (isAdmin(user)) return true;
  const authorId =
    typeof stat.author === "object" && stat.author !== null
      ? String(stat.author._id ?? stat.author)
      : String(stat.author);
  return authorId === String(user.id);
};

/**
 * Lanza NOT_FOUND si el stat no existe o no es accesible.
 * No revela si existe (evita FORBIDDEN → enumeración).
 */
export const assertCanReadStat = (
  user: StatActor,
  stat: { author: any } | null,
) => {
  if (!canReadStat(user, stat)) throw new NotFoundError("Stat not found");
  return stat!;
};
