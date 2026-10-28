export const patientTypeDefs = `#graphql
    enum SexType {
        FEMALE
        MALE
    }

    type Patient {
        _id: ID!
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
        sharedWith: [User!]
        createdAt: Date!
        updatedAt: Date!
    }

    type PatientOutput {
        _id: ID!
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
        sharedWith: [User!]
    }

    type Query {
        patients: [PatientOutput!]!
        sharedPatients: [PatientOutput!]!
        allPatients: [PatientOutput!]!

        patient(id: ID!): PatientOutput
        sharedPatient(id: ID!): PatientOutput
        allPatient(id: ID!): PatientOutput

        patientBy(name: String, identifier: String): [PatientOutput!]!
        sharedPatientBy(name: String, identifier: String): [PatientOutput!]!
        allPatientBy(name: String, identifier: String): [PatientOutput!]!
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
    }

    type Mutation {
        createPatient(input: CreatePatientInput!): PatientOutput

        updatePatient(id: ID!, input: UpdatePatientInput!): PatientOutput
        sharePatient(id: ID!, userId: ID!): PatientOutput

        deletePatient(id: ID!): PatientOutput!
        deleteSharedPatient(id: ID!, userId: ID!): PatientOutput
    }
`;
