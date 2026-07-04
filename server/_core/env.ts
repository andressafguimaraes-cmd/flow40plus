export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  adminEmail: (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(),
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.OPENAI_API_BASE ?? process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.OPENAI_API_KEY ?? process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
