import { Router } from "express";
import {
  getPlaces,
  getPlaceById,
  createPlace,
  updatePlace,
  deletePlace,
} from "../controllers/placeController";
import { authenticateToken } from "../middleware/authMiddleware";
import { requireAdmin } from "../middleware/adminMiddleware";

const router = Router();

// Public routes - visitors can view places
router.get("/", getPlaces);
router.get("/:id", getPlaceById);

// Admin-only routes - create, update and delete places
router.post("/", authenticateToken, requireAdmin, createPlace);
router.put("/:id", authenticateToken, requireAdmin, updatePlace);
router.delete("/:id", authenticateToken, requireAdmin, deletePlace);

export default router;