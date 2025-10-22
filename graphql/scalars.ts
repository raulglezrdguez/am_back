import { GraphQLScalarType, GraphQLError } from "graphql";
import { Kind } from "graphql/language/index.js";

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
            `Unexpected kind in JSON literal: ${valueAst.kind}`
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

export const scalarsTypeDefs = `#graphql
  scalar Date
  scalar JSON
  scalar StringBooleanNumber
`;

// Export all scalars
export const scalars = {
  Date: DateScalar,
  JSON: JSONScalar,
  StringBooleanNumber: StringBooleanNumberScalar,
};
