import * as userService from "../../services/user.service.ts";
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
} from "../../types/user.d.ts";

export default {
  Query: {
    users: (_: any, __: any, { currentUser }: { currentUser: User }) => {
      if (currentUser?.role === 0) return userService.listUsers();
      return [];
    },
    user: (
      _: any,
      { id }: { id: string },
      { currentUser }: { currentUser: any }
    ) => {
      if (currentUser?.role === 0) return userService.getUserById(id);
      return null;
    },
  },
  Mutation: {
    signup: (_: any, { input }: { input: CreateUserInput }) =>
      userService.createUser(input),
    updateUser: (
      _: any,
      { id, input }: { id: string; input: UpdateUserInput },
      { currentUser }: { currentUser: any }
    ) => {
      if (currentUser?.role === 0) return userService.updateUser(id, input);
      return null;
    },
    updateUserRole: (
      _: any,
      { id, role }: { id: string; role: number },
      { currentUser }: { currentUser: any }
    ) => {
      if (currentUser?.role === 0) return userService.updateUserRole(id, role);
      return null;
    },
    updateUserStatus: (
      _: any,
      { id, status }: { id: string; status: number },
      { currentUser }: { currentUser: any }
    ) => {
      if (currentUser?.role === 0)
        return userService.updateUserStatus(id, status);
      return null;
    },
    deleteUser: (
      _: any,
      { id }: { id: string },
      { currentUser }: { currentUser: any }
    ) => {
      if (currentUser.role === 0) return userService.deleteUser(id);
      return false;
    },
  },
};
