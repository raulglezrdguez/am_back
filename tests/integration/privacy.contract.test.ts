import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "@jest/globals";

const FILES = [
  "index.ts",
  "middlewares/logger.ts",
  "middlewares/errorHandler.ts",
  "middlewares/auth.ts",
  "middlewares/rateLimit.ts",
  "graphql/plugins/observability.plugin.ts",
  "services/audit.service.ts",
  "config/db.ts",
];

const RULES: Array<{ label: string; re: RegExp }> = [
  { label: "console.*", re: /\bconsole\.(log|error|warn|debug|info)\s*\(/ },
  {
    label: "logger({ err }) crudo",
    re: /logger\.(?:info|warn|error|debug|fatal|trace)\s*\(\s*\{\s*err\s*\}/,
  },
  {
    label: "stack original enviado a Sentry",
    re: /safeError\.stack\s*=\s*err\.stack/,
  },
  {
    label: "body/variables en logs",
    re: /logger\.[a-z]+\([^)]*\b(req\.body|variables)\b/s,
  },
];

describe("contrato de privacidad de logs", () => {
  it("ninguna fuente loguea PHI ni errores crudos", () => {
    const offenders: string[] = [];

    for (const rel of FILES) {
      const src = readFileSync(resolve(process.cwd(), rel), "utf8");
      for (const rule of RULES) {
        if (rule.re.test(src)) offenders.push(`${rel}: ${rule.label}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
