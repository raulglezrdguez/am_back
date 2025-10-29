export const patientTypeDefs = `#graphql
    enum SexType {
        FEMALE
        MALE
    }

    type Patient {
        id: ID!
        identifier: String!
        name: String!
        birthDate: BirthDate
        sex: SexType
        address: String
        phone: String
        email: String
        emergencyContact: String
        medicalHistory: String
        allergies: [String!]
        medications: [String!]
        public: Boolean!
        owner: User!
        createdAt: Date!
        updatedAt: Date!
    }

    type PatientOutput {
        id: ID!
        identifier: String!
        name: String!
        birthDate: BirthDate
        sex: SexType
        address: String
        phone: String
        email: String
        emergencyContact: String
        medicalHistory: String
        allergies: [String!]
        medications: [String!]
        owner: User!
    }

    type Query {
        patients: [PatientOutput!]!
        patient(id: ID!): PatientOutput
        patientBy(name: String, identifier: String): [PatientOutput!]!
    }

    input CreatePatientInput {
        identifier: String!
        name: String!
        birthDate: BirthDate
        sex: SexType
        address: String
        phone: String
        email: String
        emergencyContact: String
        medicalHistory: String
        allergies: [String!]
        medications: [String!]
    }

    input UpdatePatientInput {
        identifier: String
        name: String
        birthDate: BirthDate
        sex: SexType
        address: String
        phone: String
        email: String
        emergencyContact: String
        medicalHistory: String
        allergies: [String!]
        medications: [String!]
        public: Boolean
    }

    type Mutation {
        createPatient(input: CreatePatientInput!): PatientOutput

        updatePatient(id: ID!, input: UpdatePatientInput!): PatientOutput

        deletePatient(id: ID!): Boolean!
    }
`;
