import type { Logger } from "pino";
import type { User } from "../types/user.d.ts";

export type ApolloContext = {
  currentUser: User | null | undefined;
  requestId: string;
  ip: string | null;
  userAgent: string | null;
  logger: Logger;
  operationName?: string;
  operationType?: "query" | "mutation" | "subscription";
};
