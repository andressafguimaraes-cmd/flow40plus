import { createApp } from "../server/_core/app";

// Vercel's Node.js runtime invokes the default export as a plain
// (req, res) request handler — an Express app already matches that
// signature (it's never started with .listen() here), so it can be
// exported directly. See vercel.json for the rewrites that route
// /api/*, /manus-storage/* here.
export default createApp();
