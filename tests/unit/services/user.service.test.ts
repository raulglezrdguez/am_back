import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../../../models/user.model.ts";
import * as userService from "../../../services/user.service.ts";
import type { CreateUserInput } from "../../../types/user.d.ts";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe("UserService", () => {
  it("should create a user", async () => {
    const input: CreateUserInput = {
      name: "Ana",
      email: "ana@test.com",
      password: "1234",
    };
    const user = await userService.createUser(input);
    expect(user).toMatchObject({ name: "Ana", email: "ana@test.com" });
    expect(user.password).not.toBe("1234"); // debe estar hasheado
  });

  it("should find by email", async () => {
    await User.create({ name: "Bob", email: "bob@test.com", password: "5678" });
    const user = await userService.findByEmail("bob@test.com");
    expect(user).not.toBeNull();
    expect(user?.email).toBe("bob@test.com");
  });

  it("should return null when email not found", async () => {
    const user = await userService.findByEmail("none@test.com");
    expect(user).toBeNull();
  });

  it("should return all users", async () => {
    await User.create({ name: "Bob", email: "bob@test.com", password: "5678" });
    await User.create({ name: "Ana", email: "ana@test.com", password: "1234" });
    const users = await userService.listUsers();
    expect(users.length).toBe(2);
  });

  it("should get user by id", async () => {
    const createdUser = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
    });
    const user = await userService.getUserById(createdUser._id.toString());
    expect(user).not.toBeNull();
    expect(user?.email).toBe("bob@test.com");
  });

  it("should update user", async () => {
    const createdUser = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
    });
    const updatedUser = await userService.updateUser(
      createdUser._id.toString(),
      { name: "Bobby" }
    );
    expect(updatedUser).not.toBeNull();
    expect(updatedUser?.name).toBe("Bobby");
  });

  it("should delete user", async () => {
    const createdUser = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
    });
    await userService.deleteUser(createdUser._id.toString());
    const user = await User.findById(createdUser._id.toString());
    expect(user).toBeNull();
  });

  it("should update user role", async () => {
    const createdUser = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
      role: 0,
    });
    const updatedUser = await userService.updateUserRole(
      createdUser._id.toString(),
      1
    );
    expect(updatedUser).not.toBeNull();
    expect(updatedUser?.role).toBe(1);
  });

  it("should update user status", async () => {
    const createdUser = await User.create({
      name: "Bob",
      email: "bob@test.com",
      password: "5678",
      status: 0,
    });
    const updatedUser = await userService.updateUserStatus(
      createdUser._id.toString(),
      1
    );
    expect(updatedUser).not.toBeNull();
    expect(updatedUser?.status).toBe(1);
  });
});
