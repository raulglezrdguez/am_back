export const examTypeDefs = `#graphql
    enum Operator {
        EQ   # ==
        NE   # !=
        LT   # <
        GT   # >
        LTE  # <=
        GTE  # >=
    }

    enum AnswerType {
        RADIO
        TEXT
        NUMBER
    }

    type AnswerOption {
        id: String!
        value: String!
        content: String!
    }

    type Expression {
        id: String!
        operator: Operator!
        value: StringBooleanNumber!
        label: String!
        reference: String
        variable: String!
    }

    type Question {
        id: String!
        text: String!
        expression: Expression!
        answer: AnswerType!
        reference: String
        answers: [AnswerOption!]
    }

    type Exam {
        id: ID!
        title: String!
        subtitle: String!
        instructions: String!
        description: String!
        author: User!
        year: Int!
        public: Boolean!
        expression: [Expression!]!
        questions: [Question!]!
        createdAt: Date!
        updatedAt: Date!
    }

    type Query {
        exams: [Exam!]!
        exam(id: ID!): Exam
        myExams: [Exam!]!
    }

    input ExpressionInput {
        id: String!
        operator: Operator!
        value: StringBooleanNumber!
        label: String!
        reference: String
        variable: String!
    }

    input AnswerOptionInput {
        id: String!
        value: String!
        content: String!
    }

    input QuestionInput {
        id: String!
        text: String!
        expression: ExpressionInput!
        answer: AnswerType!
        reference: String
        answers: [AnswerOptionInput!]
    }

    input CreateExamInput {
        title: String!
        subtitle: String!
        instructions: String!
        description: String!
        year: Int!
        public: Boolean!
        expression: [ExpressionInput]!
        questions: [QuestionInput]!
    }

    input UpdateExamPropertiesInput {
        title: String!
        subtitle: String!
        instructions: String!
        description: String!
        year: Int!
        public: Boolean!
    }

    type Mutation {
        createExam(input: CreateExamInput!): Exam

        updateExamProperties(id: ID!, input: UpdateExamPropertiesInput!): Exam

        createExamExpression(id: ID!, input: [ExpressionInput!]!): Exam
        updateExamExpression(id: ID!, input: ExpressionInput!): Exam
        deleteExamExpression(id: ID!, expressionId: String!): Exam

        createExamQuestion(id: ID!, input: [QuestionInput!]!): Exam
        updateExamQuestion(id: ID!, input: QuestionInput!): Exam
        deleteExamQuestion(id: ID!, questionId: String!): Exam

        deleteExam(id: ID!): Boolean!
    }
`;
