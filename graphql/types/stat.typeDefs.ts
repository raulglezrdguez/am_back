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
        id: ID!
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
        id: ID!
        exam: Exam!
        author: User!
        completedAt: Date!
        result: StatResult!
        answers: [StatAnswer!]!
        createdAt: String!
        address: String!
    }

    type StatFilter {
        examId: ID
        completedAt: Date
        resultValue: String
        address: String
    }

    type Query {
        getStatById(id: ID!): Stat
        getStatsByPatient(patientId: ID!): [Stat!]!
        getStatsByExam(examId: ID!): [Stat!]!

        getStats(filter: StatFilter): [StatOutput!]!
    }

    input CreateStatInput {
        examId: ID!
        patientId: ID!
        completedAt: Date!
        result: StatResult!
        answers: [StatAnswer!]!
        address: String
    }

    type Mutation {
        createStat(input: CreateStatInput): Stat
    }
 `;
