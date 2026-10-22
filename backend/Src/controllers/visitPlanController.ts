import { Response } from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import { idParam, parseOrRespond, sendError } from "../http";
import { createPlanSchema, updatePlanSchema } from "../validation";

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
      include: {
        _count: {
          select: { plan_places: true },
        },
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

// ==========================================
// RENAME / RE-DATE A VISIT PLAN
// ==========================================

export const updateVisitPlan = async (
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

    const data = parseOrRespond(updatePlanSchema, req.body, res);
    if (!data) return;

    const existing = await prisma.visitPlan.findFirst({
      where: {
        plan_id: planId,
        user_id: req.user.user_id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        message: "Visit plan not found",
      });
    }

    const visitPlan = await prisma.visitPlan.update({
      where: {
        plan_id: planId,
      },
      data: {
        plan_name: data.plan_name,
        visit_date: data.visit_date ? new Date(data.visit_date) : undefined,
      },
    });

    res.json(visitPlan);
  } catch (error) {
    sendError(res, error, "Failed to update visit plan", "Visit plan not found");
  }
};

// ==========================================
// DELETE A VISIT PLAN (and its stops)
// ==========================================

export const deleteVisitPlan = async (
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

    const existing = await prisma.visitPlan.findFirst({
      where: {
        plan_id: planId,
        user_id: req.user.user_id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        message: "Visit plan not found",
      });
    }

    await prisma.$transaction([
      prisma.visitPlanPlace.deleteMany({
        where: { plan_id: planId },
      }),
      prisma.visitPlan.delete({
        where: { plan_id: planId },
      }),
    ]);

    res.json({
      message: "Visit plan deleted successfully",
      plan_id: planId,
    });
  } catch (error) {
    sendError(res, error, "Failed to delete visit plan", "Visit plan not found");
  }
};
