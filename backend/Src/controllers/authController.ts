import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import { config } from "../config";
import { parseOrRespond } from "../http";
import { loginSchema, registerSchema } from "../validation";

// Register
export const register = async (req: Request, res: Response) => {
  try {
    const data = parseOrRespond(registerSchema, req.body, res);
    if (!data) return;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user (self-registration always creates a regular user)
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: "USER",
      },
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      message: "Registration failed",
    });
  }
};

// Login
export const login = async (req: Request, res: Response) => {
  try {
    const data = parseOrRespond(loginSchema, req.body, res);
    if (!data) return;

    // Find user
    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(data.password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Create JWT
    const token = jwt.sign(
      {
        user_id: user.user_id,
        role: user.role,
      },
      config.jwtSecret,
      {
        expiresIn: config.jwtExpiresIn,
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Login failed",
    });
  }
};
