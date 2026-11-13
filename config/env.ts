import dotenv from "dotenv";

// Se importa como PRIMERA línea de instrumentation.ts y middlewares/logger.ts.
// ESM evalúa las dependencias antes del cuerpo del módulo, así que sin esto
// logger/Sentry/OTel leen process.env antes de que dotenv lo cargue.
dotenv.config({ quiet: true });
