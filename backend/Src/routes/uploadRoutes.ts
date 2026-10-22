import { Router } from "express";
import { uploadImage } from "../controllers/uploadController";
import { authenticateToken } from "../middleware/authMiddleware";
import { requireAdmin } from "../middleware/adminMiddleware";

const router = Router();

// Admin-only - place photo upload (multipart/form-data, field "image")
router.post("/", authenticateToken, requireAdmin, uploadImage);

export default router;
