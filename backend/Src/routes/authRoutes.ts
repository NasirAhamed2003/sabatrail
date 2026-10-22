import { Router } from "express";

import {
  register,
  login,
  me,
} from "../controllers/authController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Current user's profile
router.get("/me", authenticateToken, me);

export default router;
