import { Response } from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import { idParam, parseOrRespond, sendError } from "../http";
import { createPlanSchema } from "../validation";

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

    const data = parseOrRespond(createPlanSchema, req.body, res);
    if (!data) return;

    const visitPlan = await prisma.visitPlan.create({
      data: {
        user_id: req.user.user_id,
        plan_name: data.plan_name,
        visit_date: new Date(data.visit_date),
      },
    });

    res.status(201).json(visitPlan);
  } catch (error) {
    sendError(res, error, "Failed to create visit plan");
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
    sendError(res, error, "Failed to get visit plans");
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

    const planId = parseOrRespond(idParam, req.params.id, res);
    if (planId === null) return;

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
    sendError(res, error, "Failed to get visit plan");
  }
};
