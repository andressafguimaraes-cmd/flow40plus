import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// dotenv's default import only loads ".env". Layer ".env.local" (and an
// optional per-NODE_ENV local override) on top so drizzle-kit picks up the
// same local secrets the app server uses.
config({ path: ".env" });
config({ path: ".env.local", override: true });
if (process.env.NODE_ENV) {
  config({ path: `.env.${process.env.NODE_ENV}.local`, override: true });
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema_postgres.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
