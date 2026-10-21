import { Router } from "express";
import {
  createVisitPlan,
  getVisitPlans,
  getVisitPlanById,
} from "../controllers/visitPlanController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Create a visit plan
router.post("/", authenticateToken, createVisitPlan);

// Get all visit plans belonging to the logged-in user
router.get("/", authenticateToken, getVisitPlans);

// Get one visit plan belonging to the logged-in user
router.get("/:id", authenticateToken, getVisitPlanById);

export default router;