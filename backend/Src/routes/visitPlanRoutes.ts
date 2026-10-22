import { Router } from "express";
import {
  createVisitPlan,
  deleteVisitPlan,
  getVisitPlans,
  getVisitPlanById,
  updateVisitPlan,
} from "../controllers/visitPlanController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Create a visit plan
router.post("/", authenticateToken, createVisitPlan);

// Get all visit plans belonging to the logged-in user
router.get("/", authenticateToken, getVisitPlans);

// Get one visit plan belonging to the logged-in user
router.get("/:id", authenticateToken, getVisitPlanById);

// Rename or change the date of a visit plan
router.put("/:id", authenticateToken, updateVisitPlan);

// Delete a visit plan and its stops
router.delete("/:id", authenticateToken, deleteVisitPlan);

export default router;
