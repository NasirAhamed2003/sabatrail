
import { Router } from "express";

import {
  addPlaceToVisitPlan,
  getPlacesInVisitPlan,
  removePlaceFromVisitPlan,
  updateVisitPlanPlace,
} from "../controllers/visitPlanPlaceController";

import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Add a place to a user's visit plan
router.post(
  "/:planId/places",
  authenticateToken,
  addPlaceToVisitPlan
);

// Get all places inside a user's visit plan
router.get(
  "/:planId/places",
  authenticateToken,
  getPlacesInVisitPlan
);

// Update a place's visit order or planned time
router.put(
  "/:planId/places/:placeId",
  authenticateToken,
  updateVisitPlanPlace
);

// Remove a place from a user's visit plan
router.delete(
  "/:planId/places/:placeId",
  authenticateToken,
  removePlaceFromVisitPlan
);

export default router;
