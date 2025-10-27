import jwt from "jsonwebtoken";
import request from "supertest";

import { app } from "../../index.ts";
import User from "../../models/user.model.ts";
import { JWT_SECRET } from "../../config/index.ts";
import { closeTestDB, connectTestDB } from "./setup.ts";

let server: any;

beforeAll(async () => {
  await connectTestDB();
  server = app.listen(0); // puerto aleatorio

  await new Promise((resolve) => server.once("listening", resolve));
});

afterAll(async () => {
  (global as any).__TEST_TEAR_DOWN__ = true;

  await closeTestDB();

  await new Promise((resolve) => server.close(resolve));

  const admin = await import("firebase-admin");
  const apps = admin.apps;
  for (let i = 0; i < apps?.length; i++) {
    await apps[i]?.delete();
  }
});

afterEach(async () => await User.deleteMany({}));

const gql = (q: any) => ({ query: q });

describe("User GraphQL", () => {
  it("users query (administrator)", async () => {
    // creamos un usuario con role admin y generamos JWT
    const u = await User.create({
      name: "Diana",
      email: "diana@test.com",
      password: "1234",
      role: 0,
      status: 1,
    });
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: u._id, email: "diana@test.com", status: 1, role: 0 },
      JWT_SECRET
    );
    const query = `{ users { id name } }`;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(query))
      .expect(200);
    expect(res.body.data.users).toHaveLength(1);
    expect(res.body.data.users[0].name).toBe("Diana");
  });

  it("users query (commun user)", async () => {
    // creamos un usuario con role commun y generamos JWT
    const u = await User.create({
      name: "Diana",
      email: "diana@test.com",
      password: "1234",
      role: 1,
      status: 1,
    });
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: u._id, email: "diana@test.com", status: 1, role: 1 },
      JWT_SECRET
    );
    const query = `{ users { id name } }`;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(query))
      .expect(200);
    expect(res.body.data.users).toHaveLength(0);
  });

  it("users query (without token) → returns error", async () => {
    await User.create({ name: "Eve", email: "eve@test.com", password: "1234" });
    const query = `{ users { id name } }`;
    const res = await request(server)
      .post("/graphql")
      .send(gql(query))
      .expect(200);

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Authentication required");
  });

  it("user query (administrator)", async () => {
    // creamos un usuario con role admin y generamos JWT
    const u = await User.create({
      name: "Diana",
      email: "diana@test.com",
      password: "1234",
      role: 0,
      status: 1,
    });
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: u._id, email: "diana@test.com", status: 1, role: 0 },
      JWT_SECRET
    );
    const query = `{ user(id: "${u._id}") { id email name createdAt } }`;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(query))
      .expect(200);
    expect(res.body.data.user.email).toBe("diana@test.com");
  });

  it("user query (commun user)", async () => {
    const u = await User.create({
      name: "Diana",
      email: "diana@test.com",
      password: "1234",
      role: 1,
      status: 1,
    });
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: u._id, email: "diana@test.com", status: 1, role: 1 },
      JWT_SECRET
    );
    const query = `{ user(id: "${u._id}") { id name } }`;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(query))
      .expect(200);

    expect(res.body.data.user).toBeNull();
  });

  it("user query (without token) → returns error", async () => {
    const u = await User.create({
      name: "Eve",
      email: "eve@test.com",
      password: "1234",
    });
    const query = `{ user(id: "${u._id}") { id name } }`;
    const res = await request(server)
      .post("/graphql")
      .send(gql(query))
      .expect(200);

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toBe("Authentication required");
  });

  it("signup mutation", async () => {
    const mutation = `
        mutation {
          signup(input: { name: "Carlos", email: "carlos@test.com", password: "secret" }) {
            id
            name
            email
          }
        }`;
    const res = await request(server)
      .post("/graphql")
      .send(gql(mutation))
      .expect(200);
    const user = res.body.data.signup;
    expect(user.name).toBe("Carlos");
    expect(user.email).toBe("carlos@test.com");
    expect(user.password).toBeUndefined();
  });

  it("updateUser mutation", async () => {
    const u = await User.create({
      name: "Diana",
      email: "diana@test.com",
      password: "1234",
      role: 1,
      status: 1,
    });
    const root = await User.create({
      name: "Admin",
      email: "admin@test.com",
      password: "1234",
      role: 0,
      status: 1,
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: root._id, email: "admin@test.com", status: 1, role: 0 },
      JWT_SECRET
    );
    const mutation = `
        mutation {
          updateUser(id: "${u._id}", input: { name: "Carlos", email: "carlos@test.com" }) {
            id
            name
            email
          }
        }`;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);

    const user = res.body.data.updateUser;
    expect(user.name).toBe("Carlos");
    expect(user.email).toBe("carlos@test.com");
  });

  it("updateUserRole mutation", async () => {
    const u = await User.create({
      name: "Diana",
      email: "diana@test.com",
      password: "1234",
      role: 1,
      status: 1,
    });
    const root = await User.create({
      name: "Admin",
      email: "admin@test.com",
      password: "1234",
      role: 0,
      status: 1,
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: root._id, email: "admin@test.com", status: 1, role: 0 },
      JWT_SECRET
    );
    const mutation = `
        mutation {
          updateUserRole(id: "${u._id}", role: 0) {
            id
            name
            email
            role
            status
          }
        }`;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);

    const user = res.body.data.updateUserRole;
    expect(user.name).toBe("Diana");
    expect(user.email).toBe("diana@test.com");
    expect(user.role).toBe(0);
    expect(user.status).toBe(1);
  });

  it("updateUserStatus mutation", async () => {
    const u = await User.create({
      name: "Diana",
      email: "diana@test.com",
      password: "1234",
      role: 1,
      status: 1,
    });
    const root = await User.create({
      name: "Admin",
      email: "admin@test.com",
      password: "1234",
      role: 0,
      status: 1,
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: root._id, email: "admin@test.com", status: 1, role: 0 },
      JWT_SECRET
    );
    const mutation = `
        mutation {
          updateUserStatus(id: "${u._id}", status: 0 ) {
            id
            name
            email
            status
            role
          }
        }`;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);

    const user = res.body.data.updateUserStatus;
    expect(user.name).toBe("Diana");
    expect(user.email).toBe("diana@test.com");
    expect(user.role).toBe(1);
    expect(user.status).toBe(0);
  });

  it("deleteUser mutation", async () => {
    const u = await User.create({
      name: "Diana",
      email: "diana@test.com",
      password: "1234",
      role: 1,
      status: 1,
    });
    const root = await User.create({
      name: "Admin",
      email: "admin@test.com",
      password: "1234",
      role: 0,
      status: 1,
    });

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(
      { id: root._id, email: "admin@test.com", status: 1, role: 0 },
      JWT_SECRET
    );
    const mutation = `
        mutation {
          deleteUser(id: "${u._id}") {
            id
            name
            email
            status
            role
          }
        }`;
    const res = await request(server)
      .post("/graphql")
      .set("Authorization", `Bearer ${token}`)
      .send(gql(mutation))
      .expect(200);

    const user = res.body.data.deleteUser;
    expect(user.name).toBe("Diana");
    expect(user.email).toBe("diana@test.com");
    expect(user.role).toBe(1);
    expect(user.status).toBe(1);
  });
});
