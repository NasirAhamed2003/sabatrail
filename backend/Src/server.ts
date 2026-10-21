import express from "express";
import cors from "cors";
import dotenv from "dotenv";

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

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(express.json());

// ===============================
// API ROUTES
// ===============================

app.use("/api/categories", categoryRoutes);

app.use("/api/places", placeRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/visit-plans", visitPlanRoutes);

app.use("/api/visit-plans", visitPlanPlaceRoutes);

// ===============================
// BASIC TEST ROUTE
// ===============================

app.get("/", (req, res) => {
  res.json({
    message: "SabaTrail Backend API is running!",
  });
});

// ===============================
// DATABASE TEST ROUTE
// ===============================

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
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// ===============================
// AUTHENTICATION TEST ROUTE
// ===============================

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

// ===============================
// ADMIN TEST ROUTE
// ===============================

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

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
  console.log(`SabaTrail backend server running on port ${PORT}`);
});