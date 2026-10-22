import express from "express";
import cors from "cors";

import { config } from "./config";
import { prisma } from "./prisma";

import categoryRoutes from "./routes/categoryRoutes";
import placeRoutes from "./routes/placeRoutes";
import authRoutes from "./routes/authRoutes";
import visitPlanRoutes from "./routes/visitPlanRoutes";
import visitPlanPlaceRoutes from "./routes/visitPlanPlaceRoutes";

import {
  authenticateToken,
  AuthRequest,
} from "./middleware/authMiddleware";

import { requireAdmin } from "./middleware/adminMiddleware";

export const app = express();

// ===============================
// MIDDLEWARE
// ===============================

// Only the configured frontend origins may call the API from a browser.
// Requests without an Origin header (curl, Postman, server-to-server) are allowed.
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || config.corsOrigins.includes(origin));
    },
  })
);

app.use(express.json({ limit: "100kb" }));

// ===============================
// API ROUTES
// ===============================

app.use("/api/categories", categoryRoutes);

app.use("/api/places", placeRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/visit-plans", visitPlanRoutes);

app.use("/api/visit-plans", visitPlanPlaceRoutes);

// ===============================
// BASIC STATUS ROUTE
// ===============================

app.get("/", (req, res) => {
  res.json({
    message: "SabaTrail Backend API is running!",
  });
});

// ===============================
// DIAGNOSTIC ROUTES (development only, ENABLE_TEST_ROUTES=true)
// ===============================

if (config.enableTestRoutes) {
  app.get("/api/test-db", async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      res.json({
        message: "Database connection successful!",
      });
    } catch (error) {
      console.error("Database connection error:", error);

      res.status(500).json({
        message: "Database connection failed!",
      });
    }
  });

  app.get(
    "/api/test-auth",
    authenticateToken,
    (req: AuthRequest, res) => {
      res.json({
        message: "Authentication successful!",
        user: req.user,
      });
    }
  );

  app.get(
    "/api/test-admin",
    authenticateToken,
    requireAdmin,
    (req: AuthRequest, res) => {
      res.json({
        message: "Admin access successful!",
        user: req.user,
      });
    }
  );
}

// ===============================
// FALLBACK HANDLERS
// ===============================

app.use("/api", (req, res) => {
  res.status(404).json({
    message: "Endpoint not found",
  });
});

// Malformed JSON bodies and any unexpected errors
app.use(
  (
    error: Error & { type?: string },
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (error.type === "entity.parse.failed") {
      return res.status(400).json({ message: "Request body must be valid JSON" });
    }

    console.error("Unhandled error:", error);

    res.status(500).json({ message: "Something went wrong" });
  }
);
