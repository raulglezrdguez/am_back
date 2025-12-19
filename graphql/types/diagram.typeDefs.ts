export const diagramTypeDefs = `#graphql

    scalar JSONObject
    
    type NodePosition {
        x: Float!
        y: Float!
    }

    type FlowNode {
        id: ID!
        type: String!  
        position: NodePosition!
        data: JSONObject 
        # Puedes añadir otras propiedades de React Flow aquí (ej. selected, hidden)
        # width: Int
        # height: Int
    }

    type FlowEdge {
        id: ID!
        source: String!  # ID del nodo de origen
        target: String!  # ID del nodo de destino
        type: String
        # sourceHandle: String
        # targetHandle: String
        # animated: Boolean
        data: JSONObject
    }

    type FlowViewport {
        x: Float!
        y: Float!
        zoom: Float!
    }

    type Diagram {
        _id: ID!
        title: String!
        description: String!
        author: User!

        public: Boolean!
        
        # Arrays de nodos y aristas
        nodes: [FlowNode!]!
        edges: [FlowEdge!]!
        
        viewport: FlowViewport
        
        createdAt: Date!
        updatedAt: Date!
    }

    type Query {
        # Obtener todos los diagramas del usuario
        myDiagrams: [Diagram!]!
        # Obtener un diagrama del usuario por ID
        myDiagram(id: ID!): Diagram
        # Obtener los diagramas públicos
        publicDiagrams: [Diagram!]!
        # Obtener un diagrama público por ID
        publicDiagram(id: ID!): Diagram
        # Obtener todos los diagramas para user admin (públicos y privados)
        rootDiagrams: [Diagram!]!
        # Obtener un diagrama por ID para user admin (público o privado)
        rootDiagram(id: ID!): Diagram
    }

    input FlowViewportInput {
        x: Float
        y: Float
        zoom: Float
    }

    input FlowStateInput {
        nodes: [JSONObject!]! # Usamos JSONObject porque la entrada es compleja y variada
        edges: [JSONObject!]!
        viewport: FlowViewportInput
    }

    input CreateDiagramInput {
        title: String!
        description: String!
        public: Boolean
        state: FlowStateInput
    }

    input UpdateDiagramInput {
        title: String
        description: String
        public: Boolean
        state: FlowStateInput
    }

    type Mutation {
        # Crear un nuevo diagrama
        createDiagram(input: CreateDiagramInput!): Diagram!

        # Actualizar un diagrama existente
        updateDiagram(id: ID!, input: UpdateDiagramInput!): Diagram!

        # Eliminar un diagrama
        deleteDiagram(id: ID!): Diagram!

        # Modificar un diagrama como usuario root
        rootUpdateDiagram(
            id: ID!
            input: UpdateDiagramInput!
        ): Diagram!

        # Eliminar un diagrama como usuario root
        rootDeleteDiagram(id: ID!): Diagram!
    }
  
`;
