import { asAuditId, auditResolvers } from "../audit.ts";
import { type ApolloContext } from "../../config/apollo.context.ts";
import * as userService from "../../services/user.service.ts";
import type { CreateUserInput, UpdateUserInput } from "../../types/user.d.ts";

const Query = {
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
};

const Mutation = {
  signup: (_: any, { input }: { input: CreateUserInput }) =>
    userService.createUser(input),
  updateUser: (
    _: any,
    { id, input }: { id: string; input: UpdateUserInput },
    { currentUser }: ApolloContext,
  ) => {
    if (!currentUser) throw new Error("Authentication required");
    if (currentUser.role === 0) return userService.updateUser(id, input);
    return null;
  },
  updateUserRole: (
    _: any,
    { id, role }: { id: string; role: number },
    { currentUser }: ApolloContext,
  ) => {
    if (!currentUser) throw new Error("Authentication required");
    if (currentUser.role === 0) return userService.updateUserRole(id, role);
    return null;
  },
  updateUserStatus: (
    _: any,
    { id, status }: { id: string; status: number },
    { currentUser }: ApolloContext,
  ) => {
    if (!currentUser) throw new Error("Authentication required");
    if (currentUser.role === 0) return userService.updateUserStatus(id, status);
    return null;
  },
  deleteUser: (
    _: any,
    { id }: { id: string },
    { currentUser }: ApolloContext,
  ) => {
    if (!currentUser) throw new Error("Authentication required");
    if (currentUser.role === 0) return userService.deleteUser(id);
    return null;
  },
};

export default {
  User: {
    id: (parent: any) => {
      const v = parent?.id ?? parent?._id;
      if (v === undefined || v === null) {
        throw new Error("User.id: parent has neither id nor _id");
      }
      return String(v);
    },
  },
  Query: auditResolvers(Query, {
    users: {
      resourceType: "User",
      metadata: (_args, result) => ({
        resultCount: Array.isArray(result) ? result.length : 0,
      }),
    },
    user: {
      resourceType: "User",
      resourceId: (args) => asAuditId(args.id),
    },
  }),
  Mutation: auditResolvers(Mutation, {
    signup: {
      resourceType: "User",
      resourceId: (_args, result) => asAuditId(result?._id?.toString()),
    },
    updateUser: {
      resourceType: "User",
      resourceId: (args) => asAuditId(args.id),
    },
    updateUserRole: {
      resourceType: "User",
      resourceId: (args) => asAuditId(args.id),
      metadata: (args) => ({ role: args.role }),
    },
    updateUserStatus: {
      resourceType: "User",
      resourceId: (args) => asAuditId(args.id),
      metadata: (args) => ({ status: args.status }),
    },
    deleteUser: {
      resourceType: "User",
      resourceId: (args) => asAuditId(args.id),
    },
  }),
};
