import type { User } from "../types/user.d.ts";

export type ApolloContext = {
  currentUser: User | null | undefined;
};
