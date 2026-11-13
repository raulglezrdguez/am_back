import type { Logger } from "pino";
import type { User } from "./user.d.ts";

declare global {
  namespace Express {
    interface Request {
      id: string;
      log: Logger;
      user?: User | null;
    }
  }
}

export {};
