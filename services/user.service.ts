import User from "../models/user.model.ts";
import type { CreateUserInput } from "../types/createUser.d.ts";

export const createUser = async (input: CreateUserInput) =>
  await User.create(input);
export const findByEmail = async (email: string) =>
  await User.findOne({ email });
export const listUsers = async () => await User.find({});
export const getUserById = async (id: string) => await User.findById(id);
export const updateUser = async (id: string, input: Partial<CreateUserInput>) =>
  await User.findByIdAndUpdate(id, input, { new: true });
export const deleteUser = async (id: string) =>
  await User.findByIdAndDelete(id);
export const updateUserRole = async (id: string, role: number) =>
  await User.findByIdAndUpdate(id, { role }, { new: true });
export const updateUserStatus = async (id: string, status: number) =>
  await User.findByIdAndUpdate(id, { status }, { new: true });
