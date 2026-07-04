import { config } from "dotenv";

// Plain "dotenv/config" only loads ".env". Layer ".env.local" (and an
// optional per-NODE_ENV local override) on top, matching this repo's
// .gitignore convention (.env, .env.local, .env.<mode>.local), so local
// secrets actually get picked up. Must be imported first, before any module
// that reads process.env at import time (e.g. ./env), since ES module
// imports execute in declaration order before this file's own statements
// would otherwise run.
config({ path: ".env" });
config({ path: ".env.local", override: true });
if (process.env.NODE_ENV) {
  config({ path: `.env.${process.env.NODE_ENV}.local`, override: true });
}
