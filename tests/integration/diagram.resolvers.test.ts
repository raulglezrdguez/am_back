import jwt from "jsonwebtoken";
import request from "supertest";

import { app } from "../../index.ts";
import User from "../../models/user.model.ts";
import Diagram from "../../models/diagram.model.ts";
import { closeTestDB, connectTestDB } from "./setup.ts";
import { JWT_SECRET } from "../../config/index.ts";
import e from "express";

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

afterEach(async () => {
  await User.deleteMany({});
  await Diagram.deleteMany({});
});

const gql = (q: any) => ({ query: q });

describe("Diagram Resolvers", () => {
  describe("Query diagrams", () => {
    it("myDiagrams query", async () => {
      const user = await User.create({
        name: "Test User",
        email: "user@gmail.com",
        status: 1,
        role: 1,
      });

      const diagram = await Diagram.create({
        title: "Test Diagram",
        description: "A test diagram",
        public: false,
        author: user._id.toString(),
      });

      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }
      const token = jwt.sign(
        { id: user._id, email: user.email, status: 1, role: 1 },
        JWT_SECRET
      );

      const query = `{
        myDiagrams {
            _id
            title
            description
            public
            author {
                id
                email
            }
        }
    }`;

      const response = await request(server)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(gql(query));

      expect(response.status).toBe(200);
      const myDiagrams = response.body.data.myDiagrams;
      expect(myDiagrams).toBeDefined();
      expect(myDiagrams).toHaveLength(1);
      expect(myDiagrams[0].title).toBe("Test Diagram");
      expect(myDiagrams[0].description).toBe("A test diagram");
      expect(myDiagrams[0].public).toBe(false);
      expect(myDiagrams[0].author.id).toBe(user._id.toString());
      expect(myDiagrams[0].author.email).toBe(user.email);
    });

    it("myDiagram query", async () => {
      const user = await User.create({
        name: "Test User",
        email: "user@gmail.com",
        status: 1,
        role: 1,
      });

      const diagram = await Diagram.create({
        title: "Test Diagram",
        description: "A test diagram",
        public: false,
        author: user._id.toString(),
      });

      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }
      const token = jwt.sign(
        { id: user._id, email: user.email, status: 1, role: 1 },
        JWT_SECRET
      );

      const query = `{
        myDiagram(id: "${diagram._id.toString()}") {
            _id
            title
            description
            public
            author {
              id
              email
              name
            }
        }
    }`;

      const response = await request(server)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(gql(query));

      expect(response.status).toBe(200);
      const myDiagram = response.body.data.myDiagram;
      expect(myDiagram).toBeDefined();
      expect(myDiagram.title).toBe("Test Diagram");
      expect(myDiagram.description).toBe("A test diagram");
      expect(myDiagram.public).toBe(false);
      expect(myDiagram.author.id).toBe(user._id.toString());
      expect(myDiagram.author.email).toBe(user.email);
      expect(myDiagram.author.name).toBe(user.name);
    });

    it("publicDiagrams query", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@gmail.com",
        status: 1,
        role: 1,
      });

      await Diagram.create([
        {
          title: "Public Diagram",
          description: "A public diagram",
          public: true,
          author: user._id.toString(),
        },
        {
          title: "Private Diagram",
          description: "A private diagram",
          public: false,
          author: user._id.toString(),
        },
      ]);

      const query = `{  
        publicDiagrams {
            _id
            title
            description
            public
            author {
                id
                email
            }
        }
    }`;

      const response = await request(server).post("/graphql").send(gql(query));

      expect(response.status).toBe(200);
      const publicDiagrams = response.body.data.publicDiagrams;
      expect(publicDiagrams).toBeDefined();
      expect(publicDiagrams).toHaveLength(1);
      expect(publicDiagrams[0].title).toBe("Public Diagram");
      expect(publicDiagrams[0].description).toBe("A public diagram");
      expect(publicDiagrams[0].public).toBe(true);
      expect(publicDiagrams[0].author.id).toBe(user._id.toString());
      expect(publicDiagrams[0].author.email).toBe(user.email);
    });

    it("publicDiagram query", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@gmail.com",
        status: 1,
        role: 1,
      });

      const diagram = await Diagram.create({
        title: "Public Diagram",
        description: "A public diagram",
        public: true,
        author: user._id.toString(),
      });

      const query = `{
        publicDiagram(id: "${diagram._id.toString()}") {
            _id
            title
            description
            public
            author {
                id
                email
            }
        }
    }`;

      const response = await request(server).post("/graphql").send(gql(query));

      expect(response.status).toBe(200);
      const publicDiagram = response.body.data.publicDiagram;
      expect(publicDiagram).toBeDefined();
      expect(publicDiagram.title).toBe("Public Diagram");
      expect(publicDiagram.description).toBe("A public diagram");
      expect(publicDiagram.public).toBe(true);
      expect(publicDiagram.author.id).toBe(user._id.toString());
      expect(publicDiagram.author.email).toBe(user.email);
    });

    it("rootDiagrams query", async () => {
      const adminUser = await User.create({
        name: "Admin User",
        email: "admin@gmail.com",
        status: 1,
        role: 0,
      });

      const normalUser = await User.create({
        name: "Normal User",
        email: "user@gmail.com",
        status: 1,
        role: 1,
      });

      await Diagram.create([
        {
          title: "Admin's Diagram",
          description: "Diagram by admin",
          public: false,
          author: adminUser._id.toString(),
        },
        {
          title: "Normal User's Diagram",
          description: "Diagram by normal user",
          public: false,
          author: normalUser._id.toString(),
        },
      ]);

      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }
      const token = jwt.sign(
        { id: adminUser._id, email: adminUser.email, status: 1, role: 0 },
        JWT_SECRET
      );

      const query = `{
        rootDiagrams {
            _id
            title
            description
            public
            author {
                id
                email
            }
        }
    }`;

      const response = await request(server)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(gql(query));

      expect(response.status).toBe(200);
      const rootDiagrams = response.body.data.rootDiagrams;
      expect(rootDiagrams).toBeDefined();
      expect(rootDiagrams).toHaveLength(2);
    });

    it("rootDiagram query", async () => {
      const adminUser = await User.create({
        name: "Admin User",
        email: "admin@gmail.com",
        status: 1,
        role: 0,
      });
      const normalUser = await User.create({
        name: "Normal User",
        email: "user@gmail.com",
        status: 1,
        role: 1,
      });

      const diagram = await Diagram.create({
        title: "User's Diagram",
        description: "Diagram by user",
        public: false,
        author: normalUser._id.toString(),
      });

      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }
      const token = jwt.sign(
        { id: adminUser._id, email: adminUser.email, status: 1, role: 0 },
        JWT_SECRET
      );

      const query = `{
        rootDiagram(id: "${diagram._id.toString()}") {
            _id
            title
            description
            public
            author {
                id
                email
            }
        }
    }`;

      const response = await request(server)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(gql(query));

      expect(response.status).toBe(200);
      const rootDiagram = response.body.data.rootDiagram;
      expect(rootDiagram).toBeDefined();
      expect(rootDiagram.title).toBe("User's Diagram");
      expect(rootDiagram.description).toBe("Diagram by user");
      expect(rootDiagram.public).toBe(false);
      expect(rootDiagram.author.id).toBe(normalUser._id.toString());
      expect(rootDiagram.author.email).toBe(normalUser.email);
    });
  });

  describe("Mutation createDiagram", () => {
    it("creates a new diagram", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@gmail.com",
        status: 1,
        role: 1,
      });

      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }
      const token = jwt.sign(
        { id: user._id, email: user.email, status: 1, role: 1 },
        JWT_SECRET
      );

      const mutation = `mutation {
        createDiagram(input: {
            title: "New Diagram",
            description: "A newly created diagram",
            public: true
        }) {
            _id
            title
            description
            public
            author {
                id
                email
            }
        }
    }`;

      const response = await request(server)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(gql(mutation));

      expect(response.status).toBe(200);
      const createdDiagram = response.body.data.createDiagram;
      expect(createdDiagram).toBeDefined();
      expect(createdDiagram.title).toBe("New Diagram");
      expect(createdDiagram.description).toBe("A newly created diagram");
      expect(createdDiagram.public).toBe(true);
      expect(createdDiagram.author.id).toBe(user._id.toString());
      expect(createdDiagram.author.email).toBe(user.email);
    });

    it("fails to create diagram when not authenticated", async () => {
      const mutation = `mutation {
        createDiagram(input: {
            title: "New Diagram",
            description: "A newly created diagram",
            public: true
        }) {
            _id
            title
            description
            public
            author {
                id
                email
            }
        }
    }`;

      const response = await request(server)
        .post("/graphql")
        .send(gql(mutation));

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe("Authentication required");
    });

    it("fails to create diagram with invalid token", async () => {
      const mutation = `mutation {
        createDiagram(input: {
            title: "New Diagram",
            description: "A newly created diagram",
            public: true
        }) {
            _id
            title
            description
            public
            author {
                id
                email
            }
        }
    }`;

      const response = await request(server)
        .post("/graphql")
        .set("Authorization", `Bearer invalidtoken`)
        .send(gql(mutation));

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe("Authentication required");
    });

    it("fails to create diagram when missing required fields", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@gmail.com",
        status: 1,
        role: 1,
      });

      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }
      const token = jwt.sign(
        { id: user._id, email: user.email, status: 1, role: 1 },
        JWT_SECRET
      );

      const mutation = `mutation {
        createDiagram(input: {
            description: "A newly created diagram without title",
            public: true
        }) {
            _id
            title
            description
            public
            author {
                id
                email
            }
        }
    }`;

      const response = await request(server)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(gql(mutation));

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Field "CreateDiagramInput.title" of required type "String!" was not provided.'
      );
    });

    it("fails to create diagram when user does not exist", async () => {
      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }
      const token = jwt.sign(
        { id: "609e129e1c4ae12f34567890", email: "nonexistent@example.com" },
        JWT_SECRET
      );

      const mutation = `mutation {
        createDiagram(input: {
            title: "New Diagram",
            description: "A newly created diagram",
            public: true
        }) {
            _id
            title
            description
            public
            author {
                id
                email
            }
        }
    }`;

      const response = await request(server)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(gql(mutation));

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        "Authentication required"
      );
    });
  });

  describe("Mutation updateDiagram", () => {
    it("updates an existing diagram", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@gmail.com",
        status: 1,
        role: 1,
      });

      const diagram = await Diagram.create({
        title: "Old Diagram",
        description: "An old diagram",
        public: false,
        author: user._id.toString(),
      });

      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }
      const token = jwt.sign(
        { id: user._id, email: user.email, status: 1, role: 1 },
        JWT_SECRET
      );

      const mutation = `mutation {
        updateDiagram(id: "${diagram._id.toString()}", input: {
            title: "Updated Diagram",
            description: "An updated diagram",
            public: true
        }) {
            _id
            title
            description
            public
            author {
                id
                email
            }
        }
    }`;

      const response = await request(server)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(gql(mutation));

      expect(response.status).toBe(200);
      const updatedDiagram = response.body.data.updateDiagram;
      expect(updatedDiagram).toBeDefined();
      expect(updatedDiagram.title).toBe("Updated Diagram");
      expect(updatedDiagram.description).toBe("An updated diagram");
      expect(updatedDiagram.public).toBe(true);
      expect(updatedDiagram.author.id).toBe(user._id.toString());
      expect(updatedDiagram.author.email).toBe(user.email);
    });

    it("fails to update diagram when not authenticated", async () => {
      const mutation = `mutation {
        updateDiagram(id: "609e129e1c4ae12f34567890", input: {
            title: "Updated Diagram",
            description: "An updated diagram",
            public: true
        }) {
            _id
            title
            description
            public
            author {
                id
                email
            }
        }
    }`;

      const response = await request(server)
        .post("/graphql")
        .send(gql(mutation));

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe("Authentication required");
    });
  });

  describe("Mutation deleteDiagram", () => {
    it("deletes an existing diagram", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@example.com",
        status: 1,
        role: 1,
      });

      const diagram = await Diagram.create({
        title: "Old Diagram",
        description: "An old diagram",
        public: false,
        author: user._id.toString(),
      });

      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }
      const token = jwt.sign(
        { id: user._id, email: user.email, status: 1, role: 1 },
        JWT_SECRET
      );

      const mutation = `mutation {
        deleteDiagram(id: "${diagram._id.toString()}") {
            _id
            title
            description
            public
            author {
                id
                email
            }
        }
    }`;

      const response = await request(server)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(gql(mutation));

      expect(response.status).toBe(200);
      const deletedDiagram = response.body.data.deleteDiagram;
      expect(deletedDiagram).toBeDefined();
      expect(deletedDiagram._id).toBe(diagram._id.toString());
    });

    it("fails to delete diagram when not authenticated", async () => {
      const mutation = `mutation {
        deleteDiagram(id: "609e129e1c4ae12f34567890") {
            _id
            title
            description
            public
            author {
                id
                email
            }
        }
    }`;

      const response = await request(server)
        .post("/graphql")
        .send(gql(mutation));

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe("Authentication required");
    });

    it("fails to delete diagram when not found", async () => {
      const user = await User.create({
        name: "Test User",
        email: "test@gmail.com",
        status: 1,
        role: 1,
      });

      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }
      const token = jwt.sign(
        { id: user._id, email: user.email, status: 1, role: 1 },
        JWT_SECRET
      );

      const mutation = `mutation {
        deleteDiagram(id: "609e129e1c4ae12f34567890") {
            _id
            title
            description
            public
            author {
                id
                email
            }
        }
    }`;

      const response = await request(server)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(gql(mutation));

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe("Diagram not found");
    });

    it("fails to delete diagram when user is not the author", async () => {
      const authorUser = await User.create({
        name: "Author User",
        email: "author@example.com",
        status: 1,
        role: 1,
      });

      const otherUser = await User.create({
        name: "Other User",
        email: "other@example.com",
        status: 1,
        role: 1,
      });

      const diagram = await Diagram.create({
        title: "Test Diagram",
        description: "A test diagram",
        public: false,
        author: authorUser._id.toString(),
      });

      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }
      const token = jwt.sign(
        { id: otherUser._id, email: otherUser.email, status: 1, role: 1 },
        JWT_SECRET
      );

      const mutation = `mutation {
        deleteDiagram(id: "${diagram._id.toString()}") {
            _id
            title
            description
            public
            author {
                id
                email
            }
        }
    }`;

      const response = await request(server)
        .post("/graphql")
        .set("Authorization", `Bearer ${token}`)
        .send(gql(mutation));

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe(
        "Not authorized to delete this diagram"
      );
    });
  });
});
