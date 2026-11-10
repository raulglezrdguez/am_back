import { GraphQLScalarType, GraphQLError } from "graphql";
import { Kind } from "graphql/language/index.js";

export const isValidBirthDateDMY = (value: string): boolean => {
  if (typeof value !== "string") return false;
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

// Compatibilidad con el modelo, que solo usa `.test()`
export const BIRTHDATE_REGEX = {
  test: (value: string) => isValidBirthDateDMY(value),
};

// Date scalar type
export const DateScalar = new GraphQLScalarType({
  name: "Date",
  description: "Date custom scalar type",
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "string" || typeof value === "number") {
      return new Date(value).toISOString();
    }
    throw new GraphQLError("Value must be a Date, string, or number");
  },
  parseValue(value: unknown): Date {
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new GraphQLError("Invalid date format");
      }
      return date;
    }
    throw new GraphQLError("Value must be a string or number");
  },
  parseLiteral(ast): Date {
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT) {
      const date = new Date(ast.value);
      if (isNaN(date.getTime())) {
        throw new GraphQLError("Invalid date format");
      }
      return date;
    }
    throw new GraphQLError("Value must be a string or number");
  },
});

// JSON scalar type
export const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "JSON custom scalar type",
  serialize(value: unknown): unknown {
    return value;
  },
  parseValue(value: unknown): unknown {
    return value;
  },
  parseLiteral(ast): unknown {
    const parseLiteralValue = (valueAst: any): unknown => {
      switch (valueAst.kind) {
        case Kind.STRING:
          try {
            return JSON.parse(valueAst.value);
          } catch {
            return valueAst.value;
          }
        case Kind.INT:
          return parseInt(valueAst.value, 10);
        case Kind.FLOAT:
          return parseFloat(valueAst.value);
        case Kind.BOOLEAN:
          return valueAst.value;
        case Kind.NULL:
          return null;
        case Kind.OBJECT: {
          const obj: Record<string, unknown> = {};
          for (const field of valueAst.fields) {
            // Fixed: Properly type the object and handle field access safely
            const fieldName = field.name.value;
            obj[fieldName] = parseLiteralValue(field.value);
          }
          return obj;
        }
        case Kind.LIST:
          return valueAst.values.map((value: any) => parseLiteralValue(value));
        default:
          throw new GraphQLError(
            `Unexpected kind in JSON literal: ${valueAst.kind}`,
          );
      }
    };

    return parseLiteralValue(ast);
  },
});

// StringBooleanNumber scalar type
export const StringBooleanNumberScalar = new GraphQLScalarType({
  name: "StringBooleanNumber",
  description: "String | Boolean | Number custom scalar type",
  serialize(value: unknown): string {
    if (
      typeof value === "string" ||
      typeof value === "boolean" ||
      typeof value === "number"
    ) {
      return value.toString();
    }
    throw new GraphQLError("Value must be a string, boolean or number");
  },
  parseValue(value: unknown): string {
    if (
      typeof value === "string" ||
      typeof value === "boolean" ||
      typeof value === "number"
    ) {
      return value.toString();
    }
    throw new GraphQLError("Value must be a string, boolean or number");
  },
  parseLiteral(ast): string {
    if (
      ast.kind === Kind.STRING ||
      ast.kind === Kind.BOOLEAN ||
      ast.kind === Kind.INT ||
      ast.kind === Kind.FLOAT
    ) {
      return ast.value.toString();
    }
    throw new GraphQLError("Value must be a string, boolean or number");
  },
});

export const BirthDateScalar = new GraphQLScalarType({
  name: "BirthDate",
  description: "Birth date as dd-mm-yyyy (valid calendar, leap-years)",
  // valor que se envía al cliente
  serialize(value) {
    if (value instanceof Date) return formatBirthDate(value);
    if (typeof value === "string") {
      const date = new Date(value);
      if (!isNaN(date.getTime())) return formatBirthDate(date);
    }
    throw new TypeError("BirthDate can only serialize Date instances");
  },
  parseValue(value) {
    if (typeof value !== "string" || !isValidBirthDateDMY(value)) {
      throw new TypeError("BirthDate must be a valid date string (dd-mm-yyyy)");
    }
    return parseBirthDate(value);
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING || !isValidBirthDateDMY(ast.value)) {
      throw new TypeError("BirthDate must be a valid date string (dd-mm-yyyy)");
    }
    return parseBirthDate(ast.value);
  },
});

export const formatBirthDate = (date: Date): string => {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d}-${m}-${y}`;
};

export const parseBirthDate = (dateStr: string): Date => {
  const [d, m, y] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export const scalarsTypeDefs = `#graphql
  scalar Date
  scalar JSON
  scalar StringBooleanNumber
  scalar BirthDate
`;

// Export all scalars
export const scalars = {
  Date: DateScalar,
  JSON: JSONScalar,
  StringBooleanNumber: StringBooleanNumberScalar,
  BirthDate: BirthDateScalar,
};
