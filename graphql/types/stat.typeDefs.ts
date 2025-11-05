export const statTypeDefs = `#graphql
    type StatResult {
        value: String!
        text: String!
    }

    type StatAnswer {
        id: String!
        answer: String!
    }

    type Stat {
        _id: ID!
        exam: Exam!
        patient: Patient!
        author: User!
        completedAt: Date!
        result: StatResult!
        answers: [StatAnswer!]!
        address: String
        createdAt: String!
    }

    type StatOutput {
        _id: ID!
        exam: Exam!
        author: User!
        completedAt: Date!
        result: StatResult!
        answers: [StatAnswer!]!
        createdAt: String!
        address: String!
    }

    input StatFilterInput {
        examId: ID
        completedAt: Date
        resultValue: String
        address: String
    }

    type Query {
        getStatById(id: ID!): Stat
        getStatsByPatient(id: ID!): [Stat!]!
        getStatsByExam(id: ID!): [Stat!]!

        getStats(filter: StatFilterInput): [StatOutput!]!
    }

    input StatResultInput {
        value: String!
        text: String!
    }

    input StatAnswerInput {
        id: String!
        answer: String!
    }

    input CreateStatInput {
        examId: ID!
        patientId: ID!
        completedAt: Date!
        result: StatResultInput!
        answers: [StatAnswerInput!]!
        address: String
    }

    type Mutation {
        createStat(input: CreateStatInput): Stat
    }
 `;
