import "./loadEnv";
import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerCronRoutes } from "./cronRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { ENV } from "./env";

// Builds the API-only Express app (tRPC + storage proxy), with no
// long-lived .listen() and no static/Vite serving. Shared by:
// - server/_core/index.ts (traditional Node process: local dev, Render)
// - api/index.ts (Vercel serverless function — Express apps are callable
//   as (req, res) handlers, matching Vercel's Node.js runtime contract)
export function createApp(): Express {
  // Fail fast and loudly in production instead of silently discarding every
  // write once a request finally touches the database.
  if (ENV.isProduction && !process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required in production. Set it before starting the server."
    );
  }

  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerCronRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path }) {
        // The client only ever sees a sanitized message (see errorFormatter
        // in trpc.ts) — log the real error and its root cause (e.g. the
        // underlying pg connection error behind a Drizzle "Failed query")
        // here so it's visible in server/Vercel runtime logs.
        console.error(`[tRPC] ${path ?? "<unknown>"} failed:`, error);
        if (error.cause) {
          console.error(`[tRPC] ${path ?? "<unknown>"} cause:`, error.cause);
        }
      },
    })
  );

  return app;
}
