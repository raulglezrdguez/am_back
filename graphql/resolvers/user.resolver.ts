import * as userService from "../../services/user.service.ts";
import type { CreateUserInput } from "../../types/createUser.d.ts";

export default {
  Query: {
    users: (_: any, __: any, { currentUser }: { currentUser: any }) => {
      console.log(currentUser);
      return userService.listUsers();
    },
    user: (_: any, { id }: { id: string }) => userService.getUserById(id),
  },
  Mutation: {
    signup: (_: any, { input }: { input: CreateUserInput }) =>
      userService.createUser(input),
    updateUserRole: (_: any, { id, role }: { id: string; role: number }) =>
      userService.updateUserRole(id, role),
    updateUserStatus: (
      _: any,
      { id, status }: { id: string; status: number }
    ) => userService.updateUserStatus(id, status),
  },
};
