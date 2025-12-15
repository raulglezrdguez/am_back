import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Diagram from "../../../models/diagram.model.ts";
import User from "../../../models/user.model.ts";
import * as diagramService from "../../../services/diagram.service.ts";

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
  await Diagram.deleteMany({});
});

describe("Diagram service", () => {
  it("should create a diagram", async () => {
    const user = await User.create({
      name: "Test User",
      email: "test@gmail.com",
      role: 1,
      status: 1,
    });
    const diagramData = {
      title: "Test Diagram",
      description: "A diagram for testing",
      public: true,
      author: user._id.toString(),
      nodes: [
        {
          id: "node1",
          type: "typeA",
          position: { x: 0, y: 0 },
          data: { label: "Node label" },
        },
      ],
      edges: [
        {
          id: "edge1",
          source: "node1",
          target: "node2",
          data: { condition: 'answers["nodo1"] === 5' },
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    const diagram = await diagramService.createDiagram(diagramData);
    expect(diagram).toBeDefined();
    expect(diagram.title).toBe(diagramData.title);
    expect(diagram.author._id.toString()).toBe(user._id.toString());
    expect(diagram.nodes[0].data.label).toBe("Node label");
    expect(diagram.edges[0].data.condition).toBe('answers["nodo1"] === 5');
  });

  it("should update a diagram", async () => {
    const user = await User.create({
      name: "Update User",
      email: "user@gmail.com",
      role: 1,
      status: 1,
    });
    const diagram = await diagramService.createDiagram({
      title: "Original Title",
      description: "Original Description",
      public: false,
      author: user._id.toString(),
    });
    const updatedData = {
      title: "Updated Title",
      description: "Updated Description",
      public: true,
    };
    const updatedDiagram = await diagramService.updateDiagram(
      diagram._id.toString(),
      updatedData
    );
    expect(updatedDiagram).toBeDefined();
    expect(updatedDiagram?.title).toBe(updatedData.title);
    expect(updatedDiagram?.description).toBe(updatedData.description);
    expect(updatedDiagram?.public).toBe(true);
  });

  it("should delete a diagram", async () => {
    const user = await User.create({
      name: "Delete User",
      email: "user@gmail.com",
      role: 1,
      status: 1,
    });
    const diagram = await diagramService.createDiagram({
      title: "Diagram to Delete",
      description: "This diagram will be deleted",
      public: false,
      author: user._id.toString(),
    });
    const deletedDiagram = await diagramService.deleteDiagram(
      diagram._id.toString()
    );
    expect(deletedDiagram).toBeDefined();
    expect(deletedDiagram?._id.toString()).toBe(diagram._id.toString());
    const foundDiagram = await diagramService.getDiagramById(
      diagram._id.toString()
    );
    expect(foundDiagram).toBeNull();
  });

  it("should list diagrams by author", async () => {
    const user = await User.create({
      name: "Author User",
      email: "user@gmail.com",
      role: 1,
      status: 1,
    });
    const diagram1 = await diagramService.createDiagram({
      title: "Diagram 1",
      description: "First diagram",
      public: false,
      author: user._id.toString(),
    });
    const diagram2 = await diagramService.createDiagram({
      title: "Diagram 2",
      description: "Second diagram",
      public: true,
      author: user._id.toString(),
    });
    const diagrams = await diagramService.listDiagramsByAuthor(
      user._id.toString()
    );
    expect(diagrams.length).toBe(2);
    const titles = diagrams.map((d) => d.title);
    expect(titles).toContain("Diagram 1");
    expect(titles).toContain("Diagram 2");
  });

  it("should list public diagrams", async () => {
    const user = await User.create({
      name: "Public User",
      email: "user@gmail.com",
      role: 1,
      status: 1,
    });
    await diagramService.createDiagram({
      title: "Private Diagram",
      description: "This is private",
      public: false,
      author: user._id.toString(),
    });
    await diagramService.createDiagram({
      title: "Public Diagram",
      description: "This is public",
      public: true,
      author: user._id.toString(),
    });
    const diagrams = await diagramService.listPublicDiagrams();
    expect(diagrams.length).toBe(1);
    expect(diagrams[0].title).toBe("Public Diagram");
  });

  it("should get diagram by id", async () => {
    const user = await User.create({
      name: "GetById User",
      email: "user@gmail.com",
      role: 1,
      status: 1,
    });
    const diagram = await diagramService.createDiagram({
      title: "GetById Diagram",
      description: "Diagram to get by ID",
      public: true,
      author: user._id.toString(),
    });
    const foundDiagram = await diagramService.getDiagramById(
      diagram._id.toString()
    );
    expect(foundDiagram).toBeDefined();
    expect(foundDiagram?.title).toBe("GetById Diagram");
    expect(foundDiagram?.author._id.toString()).toBe(user._id.toString());
  });

  it("should get diagram by author id", async () => {
    const user = await User.create({
      name: "GetByAuthorId User",
      email: "user@gmail.com",
      role: 1,
      status: 1,
    });
    const diagram = await diagramService.createDiagram({
      title: "GetByAuthorId Diagram",
      description: "Diagram to get by author ID",
      public: false,
      author: user._id.toString(),
    });
    const diagrams = await diagramService.getDiagramByAuthorId(
      diagram._id.toString(),
      user._id.toString()
    );
    expect(diagrams.length).toBe(1);
    expect(diagrams[0].title).toBe("GetByAuthorId Diagram");
    expect(diagrams[0].author._id.toString()).toBe(user._id.toString());
  });

  it("should get public diagram by id", async () => {
    const user = await User.create({
      name: "GetPublicById User",
      email: "use@gmail.com",
      role: 1,
      status: 1,
    });
    const diagram = await diagramService.createDiagram({
      title: "GetPublicById Diagram",
      description: "Public diagram to get by ID",
      public: true,
      author: user._id.toString(),
    });
    await diagramService.createDiagram({
      title: "Private Diagram",
      description: "Private diagram should not be found",
      public: false,
      author: user._id.toString(),
    });
    const diagrams = await diagramService.getPublicDiagramById(
      diagram._id.toString()
    );
    expect(diagrams.length).toBe(1);
    expect(diagrams[0].title).toBe("GetPublicById Diagram");
    expect(diagrams[0].author._id.toString()).toBe(user._id.toString());
  });

  it("should get all diagrams", async () => {
    const user = await User.create({
      name: "GetAll User",
      email: "user@gmail.com",
      role: 1,
      status: 1,
    });
    await diagramService.createDiagram({
      title: "Diagram One",
      description: "First diagram",
      public: true,
      author: user._id.toString(),
    });
    await diagramService.createDiagram({
      title: "Diagram Two",
      description: "Second diagram",
      public: false,
      author: user._id.toString(),
    });
    const diagrams = await diagramService.getAllDiagrams();
    expect(diagrams.length).toBe(2);
    const titles = diagrams.map((d) => d.title);
    expect(titles).toContain("Diagram One");
    expect(titles).toContain("Diagram Two");
  });

  it("should find diagrams by node type", async () => {
    const user = await User.create({
      name: "Node Type User",
      email: "user@gmail.com",
      role: 1,
      status: 1,
    });
    await diagramService.createDiagram({
      title: "Diagram with TypeA",
      description: "Diagram containing TypeA node",
      public: true,
      author: user._id.toString(),
      nodes: [
        {
          id: "node1",
          type: "TypeA",
          position: { x: 0, y: 0 },
        },
      ],
    });
    await diagramService.createDiagram({
      title: "Diagram with TypeB",
      description: "Diagram containing TypeB node",
      public: true,
      author: user._id.toString(),
      nodes: [
        {
          id: "node2",
          type: "TypeB",
          position: { x: 10, y: 10 },
        },
      ],
    });
    const diagrams = await diagramService.findDiagramsByNodeType("TypeA");
    expect(diagrams.length).toBe(1);
    expect(diagrams[0].title).toBe("Diagram with TypeA");
    expect(diagrams[0].nodes[0].type).toBe("TypeA");
    expect(diagrams[0].author._id.toString()).toBe(user._id.toString());
  });

  it("should find diagrams by node label", async () => {
    const user = await User.create({
      name: "Node Label User",
      email: "user@gmail.com",
      role: 1,
      status: 1,
    });
    await diagramService.createDiagram({
      title: "Diagram with LabelX",
      description: "Diagram containing node with LabelX",
      public: true,
      author: user._id.toString(),
      nodes: [
        {
          id: "node1",
          type: "SomeType",
          position: { x: 0, y: 0 },
          data: { label: "LabelX" },
        },
      ],
    });
    await diagramService.createDiagram({
      title: "Diagram with LabelY",
      description: "Diagram containing node with LabelY",
      public: true,
      author: user._id.toString(),
      nodes: [
        {
          id: "node2",
          type: "SomeType",
          position: { x: 10, y: 10 },
          data: { label: "LabelY" },
        },
      ],
    });
    const diagrams = await diagramService.findDiagramsByNodeLabel("LabelX");
    expect(diagrams.length).toBe(1);
    expect(diagrams[0].title).toBe("Diagram with LabelX");
    expect(diagrams[0].nodes[0].data.label).toBe("LabelX");
    expect(diagrams[0].author._id.toString()).toBe(user._id.toString());
  });

  it("should find diagrams by node type and label", async () => {
    const user = await User.create({
      name: "Node Type Label User",
      email: "user@gmail.com",
      role: 1,
      status: 1,
    });
    await diagramService.createDiagram({
      title: "Diagram with TypeX and LabelY",
      description: "Diagram containing TypeX node with LabelY",
      public: true,
      author: user._id.toString(),
      nodes: [
        {
          id: "node1",
          type: "TypeX",
          position: { x: 0, y: 0 },
          data: { label: "LabelY" },
        },
      ],
    });
    await diagramService.createDiagram({
      title: "Diagram with TypeX and LabelZ",
      description: "Diagram containing TypeX node with LabelZ",
      public: true,
      author: user._id.toString(),
      nodes: [
        {
          id: "node2",
          type: "TypeX",
          position: { x: 10, y: 10 },
          data: { label: "LabelZ" },
        },
      ],
    });
    const diagrams = await diagramService.findDiagramsByNodeTypeAndLabel(
      "TypeX",
      "LabelY"
    );
    expect(diagrams.length).toBe(1);
    expect(diagrams[0].title).toBe("Diagram with TypeX and LabelY");
    expect(diagrams[0].nodes[0].type).toBe("TypeX");
    expect(diagrams[0].nodes[0].data.label).toBe("LabelY");
    expect(diagrams[0].author._id.toString()).toBe(user._id.toString());
  });
});
