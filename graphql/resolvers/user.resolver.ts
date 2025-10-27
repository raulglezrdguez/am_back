import { type ApolloContext } from "../../config/apollo.context.ts";
import * as userService from "../../services/user.service.ts";
import type { CreateUserInput, UpdateUserInput } from "../../types/user.d.ts";

export default {
  Query: {
    users: (_: any, __: any, { currentUser }: ApolloContext) => {
      if (!currentUser) throw new Error("Authentication required");

      if (currentUser?.role === 0) return userService.listUsers();
      return [];
    },
    user: (_: any, { id }: { id: string }, { currentUser }: ApolloContext) => {
      if (!currentUser) throw new Error("Authentication required");

      if (currentUser.role === 0) return userService.getUserById(id);
      return null;
    },
  },
  Mutation: {
    signup: (_: any, { input }: { input: CreateUserInput }) =>
      userService.createUser(input),
    updateUser: (
      _: any,
      { id, input }: { id: string; input: UpdateUserInput },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      if (currentUser.role === 0) return userService.updateUser(id, input);
      return null;
    },
    updateUserRole: (
      _: any,
      { id, role }: { id: string; role: number },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      if (currentUser.role === 0) return userService.updateUserRole(id, role);
      return null;
    },
    updateUserStatus: (
      _: any,
      { id, status }: { id: string; status: number },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      if (currentUser.role === 0)
        return userService.updateUserStatus(id, status);
      return null;
    },
    deleteUser: (
      _: any,
      { id }: { id: string },
      { currentUser }: ApolloContext
    ) => {
      if (!currentUser) throw new Error("Authentication required");

      if (currentUser.role === 0) return userService.deleteUser(id);
      return null;
    },
  },
};
