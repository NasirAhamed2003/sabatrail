import express from "express";
import cors from "cors";

import { config } from "./config";
import { prisma } from "./prisma";
import { UPLOADS_DIR } from "./uploads";

import categoryRoutes from "./routes/categoryRoutes";
import placeRoutes from "./routes/placeRoutes";
import authRoutes from "./routes/authRoutes";
import visitPlanRoutes from "./routes/visitPlanRoutes";
import visitPlanPlaceRoutes from "./routes/visitPlanPlaceRoutes";
import uploadRoutes from "./routes/uploadRoutes";

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

// Uploaded place photos. File names are random UUIDs that never change, so
// they can be cached for a long time. nosniff stops a browser from treating
// an image as anything else.
app.use(
  "/uploads",
  express.static(UPLOADS_DIR, {
    index: false,
    dotfiles: "deny",
    fallthrough: false,
    maxAge: "30d",
    immutable: true,
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  })
);

// ===============================
// API ROUTES
// ===============================

app.use("/api/categories", categoryRoutes);

app.use("/api/places", placeRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/visit-plans", visitPlanRoutes);

app.use("/api/visit-plans", visitPlanPlaceRoutes);

app.use("/api/uploads", uploadRoutes);

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

    // Missing file under /uploads (express.static with fallthrough: false)
    const status = (error as { status?: number }).status;
    if (status === 404 || status === 403) {
      return res.status(status).json({ message: status === 404 ? "File not found" : "Forbidden" });
    }

    console.error("Unhandled error:", error);

    res.status(500).json({ message: "Something went wrong" });
  }
);
