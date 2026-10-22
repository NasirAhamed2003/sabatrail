import "dotenv/config";

// ===============================
// APPLICATION CONFIGURATION
// Every module reads settings from here so behaviour stays consistent.
// ===============================

const isProduction = process.env.NODE_ENV === "production";

// The same secret is used to sign tokens (authController) and to verify them
// (authMiddleware). A missing secret is fatal in production; in development a
// fixed fallback keeps login and protected routes working together.
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret && isProduction) {
  throw new Error("JWT_SECRET must be set in production");
}

export const config = {
  isProduction,
  port: Number(process.env.PORT) || 5000,
  jwtSecret: jwtSecret || "sabatrail-dev-only-secret",
  jwtExpiresIn: "1d" as const,

  // Comma-separated list of allowed browser origins
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  // /api/test-* diagnostic routes are only mounted when explicitly enabled
  enableTestRoutes: !isProduction && process.env.ENABLE_TEST_ROUTES === "true",
};
