import bcrypt from "bcrypt";
import User, { USER_ROLES, USER_STATUSES } from "../models/user.model.ts";
import { UPDATE_OPTS } from "./utils.ts";
import type { CreateUserInput } from "../types/user.d.ts";
import { badInput, notFound } from "../errors/appError.ts";

export const createUser = async (input: CreateUserInput) => {
  if (input.password) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(input.password, salt);
    input.password = hashedPassword;
  }

  return await User.create(input);
};
export const findByEmail = async (email: string) =>
  await User.findOne({ email }).lean();
export const listUsers = async () => await User.find({}).lean();
export const getUserById = async (id: string) => await User.findById(id).lean();
export const updateUser = async (
  id: string,
  input: Partial<CreateUserInput>,
) => {
  // Nunca permitir cambiar password por esta vía sin hash; y nunca permitir
  // cambiar role/status desde updateUser (tienen sus propios endpoints).
  const { password, ...rest } = input;

  const patch: Record<string, unknown> = { ...rest };

  if (password) {
    const salt = await bcrypt.genSalt(10);
    patch.password = await bcrypt.hash(password, salt);
  }

  const user = await User.findByIdAndUpdate(id, patch, UPDATE_OPTS);
  if (!user) throw notFound("Resource not found");
  return user;
};

export const updateUserRole = async (id: string, role: number) => {
  if (!USER_ROLES.includes(role as any)) {
    throw badInput("Invalid input");
  }
  const user = await User.findByIdAndUpdate(id, { role }, UPDATE_OPTS);
  if (!user) throw notFound("Resource not found");
  return user;
};

export const updateUserStatus = async (id: string, status: number) => {
  if (!USER_STATUSES.includes(status as any)) {
    throw badInput("Invalid input");
  }
  const user = await User.findByIdAndUpdate(id, { status }, UPDATE_OPTS);
  if (!user) throw notFound("Resource not found");
  return user;
};

export const deleteUser = async (id: string) =>
  await User.findByIdAndDelete(id);
