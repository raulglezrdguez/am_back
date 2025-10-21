import type { User } from "./createUser.js";

declare global {
  namespace Express {
    interface Request {
      user?: User | null;
    }
  }
}

export {};
