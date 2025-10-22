import type { User } from "./user.d.ts";

declare global {
  namespace Express {
    interface Request {
      user?: User | null;
    }
  }
}

export {};
