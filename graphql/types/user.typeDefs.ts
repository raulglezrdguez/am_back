export const userTypeDefs = `#graphql
  type User {
    id: ID!
    name: String!
    email: String!
    role: Int!
    status: Int!
    createdAt: Date!
    updatedAt: Date!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
  }

  type Mutation {
    signup(input: SignupInput!): User
    updateUser(id: ID!, input: UpdateUserInput!): User
    deleteUser(id: ID!): Boolean!
    updateUserRole(id: ID!, role: Int!): User
    updateUserStatus(id: ID!, status: Int!): User
  }

  input SignupInput {
    name: String!
    email: String!
    password: String!
  }

  input UpdateUserInput {
    name: String
    email: String
  }
`;
