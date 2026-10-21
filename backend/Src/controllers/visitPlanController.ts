import { Response } from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/authMiddleware";

// ==========================================
// CREATE VISIT PLAN
// ==========================================

export const createVisitPlan = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { plan_name, visit_date } = req.body;

    if (!plan_name || !visit_date) {
      return res.status(400).json({
        message: "Plan name and visit date are required",
      });
    }

    const visitPlan = await prisma.visitPlan.create({
      data: {
        user_id: req.user.user_id,
        plan_name: plan_name.trim(),
        visit_date: new Date(visit_date),
      },
    });

    res.status(201).json(visitPlan);
  } catch (error) {
    console.error("Error creating visit plan:", error);

    res.status(500).json({
      message: "Failed to create visit plan",
    });
  }
};

// ==========================================
// GET USER'S VISIT PLANS
// ==========================================

export const getVisitPlans = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const visitPlans = await prisma.visitPlan.findMany({
      where: {
        user_id: req.user.user_id,
      },
      orderBy: {
        visit_date: "asc",
      },
    });

    res.json(visitPlans);
  } catch (error) {
    console.error("Error getting visit plans:", error);

    res.status(500).json({
      message: "Failed to get visit plans",
    });
  }
};

// ==========================================
// GET ONE VISIT PLAN
// ==========================================

export const getVisitPlanById = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const planId = Number(req.params.id);

    if (isNaN(planId)) {
      return res.status(400).json({
        message: "Invalid plan ID",
      });
    }

    const visitPlan = await prisma.visitPlan.findFirst({
      where: {
        plan_id: planId,
        user_id: req.user.user_id,
      },
      include: {
        plan_places: {
          orderBy: {
            visit_order: "asc",
          },
          include: {
            place: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!visitPlan) {
      return res.status(404).json({
        message: "Visit plan not found",
      });
    }

    res.json(visitPlan);
  } catch (error) {
    console.error("Error getting visit plan:", error);

    res.status(500).json({
      message: "Failed to get visit plan",
    });
  }
};