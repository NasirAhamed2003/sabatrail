import { Router } from "express";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController";
import { authenticateToken } from "../middleware/authMiddleware";
import { requireAdmin } from "../middleware/adminMiddleware";

const router = Router();

// Public routes - visitors can view categories
router.get("/", getCategories);
router.get("/:id", getCategoryById);

// Admin-only routes - create, update and delete categories
router.post("/", authenticateToken, requireAdmin, createCategory);
router.put("/:id", authenticateToken, requireAdmin, updateCategory);
router.delete("/:id", authenticateToken, requireAdmin, deleteCategory);

export default router;