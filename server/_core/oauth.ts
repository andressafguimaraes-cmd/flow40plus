import type { Express } from "express";

// Manus OAuth routes have been replaced by the app's own email/password
// auth (see auth.signup / auth.login / auth.logout in server/routers.ts).
// Kept as a no-op registration point so server/_core/index.ts doesn't need
// to change its wiring.
export function registerOAuthRoutes(_app: Express) {}
