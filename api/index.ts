// dist/app.mjs only exists after `pnpm build` runs (see package.json); it's
// the pre-bundled server (esbuild --bundle), imported with its real
// extension so Vercel's native Node ESM loader can resolve it. Importing
// the raw TS source with an extensionless relative path instead breaks at
// runtime with ERR_MODULE_NOT_FOUND: unlike the esbuild bundle used for
// local dev/Render, Vercel compiles api/*.ts files individually rather
// than bundling their whole import graph into one file, and Node's
// "type": "module" ESM resolver (unlike CommonJS require) never guesses
// extensions.

// @ts-expect-error — dist/app.mjs is a build output, not a TS source file
import { createApp } from "../dist/app.mjs";

// Vercel's Node.js runtime invokes the default export as a plain
// (req, res) request handler — an Express app already matches that
// signature (it's never started with .listen() here), so it can be
// exported directly. See vercel.json for the rewrites that route
// /api/*, /manus-storage/* here.
export default createApp();
