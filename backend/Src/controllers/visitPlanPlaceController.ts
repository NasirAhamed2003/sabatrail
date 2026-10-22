import { Response } from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import { idParam, parseOrRespond, sendError } from "../http";
import { addPlanPlaceSchema, reorderSchema, updatePlanPlaceSchema } from "../validation";

// Find a plan only if it belongs to the logged-in user
async function findOwnedPlan(planId: number, userId: number) {
  return prisma.visitPlan.findFirst({
    where: {
      plan_id: planId,
      user_id: userId,
    },
  });
}

// ==========================================
// ADD PLACE TO VISIT PLAN
// ==========================================

export const addPlaceToVisitPlan = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // Check whether the user is logged in
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const planId = parseOrRespond(idParam, req.params.planId, res);
    if (planId === null) return;

    const data = parseOrRespond(addPlanPlaceSchema, req.body, res);
    if (!data) return;

    // Check that the visit plan belongs to the logged-in user
    const visitPlan = await findOwnedPlan(planId, req.user.user_id);

    if (!visitPlan) {
      return res.status(404).json({
        message: "Visit plan not found",
      });
    }

    // Check that the place exists
    const place = await prisma.place.findUnique({
      where: {
        place_id: data.place_id,
      },
    });

    if (!place) {
      return res.status(404).json({
        message: "Place not found",
      });
    }

    // Check whether the place is already in the plan
    const existingPlanPlace = await prisma.visitPlanPlace.findFirst({
      where: {
        plan_id: planId,
        place_id: data.place_id,
      },
    });

    if (existingPlanPlace) {
      return res.status(409).json({
        message: "Place is already added to this visit plan",
      });
    }

    // Without an explicit order, the place is added at the end of the day
    let order = data.visit_order;

    if (order === undefined) {
      const last = await prisma.visitPlanPlace.aggregate({
        where: { plan_id: planId },
        _max: { visit_order: true },
      });

      order = (last._max.visit_order ?? 0) + 1;
    }

    // Create the plan-place relationship
    const planPlace = await prisma.visitPlanPlace.create({
      data: {
        plan_id: planId,
        place_id: data.place_id,
        visit_order: order,
        planned_time: data.planned_time,
      },
      include: {
        place: {
          include: {
            category: true,
          },
        },
      },
    });

    return res.status(201).json(planPlace);
  } catch (error) {
    return sendError(res, error, "Failed to add place to visit plan");
  }
};

// ==========================================
// GET PLACES INSIDE A VISIT PLAN
// ==========================================

export const getPlacesInVisitPlan = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // Check whether the user is logged in
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const planId = parseOrRespond(idParam, req.params.planId, res);
    if (planId === null) return;

    // Check that the visit plan belongs to the logged-in user
    const visitPlan = await findOwnedPlan(planId, req.user.user_id);

    if (!visitPlan) {
      return res.status(404).json({
        message: "Visit plan not found",
      });
    }

    // Retrieve places in visit order
    const planPlaces = await prisma.visitPlanPlace.findMany({
      where: {
        plan_id: planId,
      },
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
    });

    return res.json({
      plan_id: planId,
      plan_name: visitPlan.plan_name,
      visit_date: visitPlan.visit_date,
      total_places: planPlaces.length,
      places: planPlaces,
    });
  } catch (error) {
    return sendError(res, error, "Failed to get places in visit plan");
  }
};

// ==========================================
// REMOVE PLACE FROM VISIT PLAN
// ==========================================

export const removePlaceFromVisitPlan = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // Check whether the user is logged in
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const planId = parseOrRespond(idParam, req.params.planId, res);
    if (planId === null) return;

    const placeId = parseOrRespond(idParam, req.params.placeId, res);
    if (placeId === null) return;

    // Check that the visit plan belongs to the logged-in user
    const visitPlan = await findOwnedPlan(planId, req.user.user_id);

    if (!visitPlan) {
      return res.status(404).json({
        message: "Visit plan not found",
      });
    }

    // Check that the place is in this visit plan
    const planPlace = await prisma.visitPlanPlace.findFirst({
      where: {
        plan_id: planId,
        place_id: placeId,
      },
    });

    if (!planPlace) {
      return res.status(404).json({
        message: "Place not found in this visit plan",
      });
    }

    // Remove the place and renumber the remaining stops 1..n in one transaction
    await prisma.$transaction(async (tx) => {
      await tx.visitPlanPlace.delete({
        where: {
          plan_place_id: planPlace.plan_place_id,
        },
      });

      const remaining = await tx.visitPlanPlace.findMany({
        where: { plan_id: planId },
        orderBy: [{ visit_order: "asc" }, { plan_place_id: "asc" }],
      });

      for (const [index, stop] of remaining.entries()) {
        if (stop.visit_order !== index + 1) {
          await tx.visitPlanPlace.update({
            where: { plan_place_id: stop.plan_place_id },
            data: { visit_order: index + 1 },
          });
        }
      }
    });

    return res.json({
      message: "Place removed from visit plan successfully",
      plan_id: planId,
      place_id: placeId,
    });
  } catch (error) {
    return sendError(res, error, "Failed to remove place from visit plan");
  }
};

// ==========================================
// UPDATE PLACE ORDER AND PLANNED TIME
// ==========================================

export const updateVisitPlanPlace = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // Check whether the user is logged in
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const planId = parseOrRespond(idParam, req.params.planId, res);
    if (planId === null) return;

    const placeId = parseOrRespond(idParam, req.params.placeId, res);
    if (placeId === null) return;

    const data = parseOrRespond(updatePlanPlaceSchema, req.body, res);
    if (!data) return;

    // Check that the plan belongs to the logged-in user
    const visitPlan = await findOwnedPlan(planId, req.user.user_id);

    if (!visitPlan) {
      return res.status(404).json({
        message: "Visit plan not found",
      });
    }

    // Check that the place belongs to this plan
    const existingPlanPlace = await prisma.visitPlanPlace.findFirst({
      where: {
        plan_id: planId,
        place_id: placeId,
      },
    });

    if (!existingPlanPlace) {
      return res.status(404).json({
        message: "Place not found in this visit plan",
      });
    }

    // Update the selected place in the visit plan
    const updatedPlanPlace = await prisma.visitPlanPlace.update({
      where: {
        plan_place_id: existingPlanPlace.plan_place_id,
      },
      data: {
        visit_order: data.visit_order,
        planned_time: data.planned_time,
      },
      include: {
        place: {
          include: {
            category: true,
          },
        },
      },
    });

    return res.json({
      message: "Visit plan place updated successfully",
      plan_place: updatedPlanPlace,
    });
  } catch (error) {
    return sendError(res, error, "Failed to update visit plan place");
  }
};

// ==========================================
// REORDER ALL STOPS IN A PLAN
// Body: { place_ids: [3, 1, 2] } - every place in the plan, in the new order
// ==========================================

export const reorderVisitPlanPlaces = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const planId = parseOrRespond(idParam, req.params.planId, res);
    if (planId === null) return;

    const data = parseOrRespond(reorderSchema, req.body, res);
    if (!data) return;

    const visitPlan = await findOwnedPlan(planId, req.user.user_id);

    if (!visitPlan) {
      return res.status(404).json({
        message: "Visit plan not found",
      });
    }

    const stops = await prisma.visitPlanPlace.findMany({
      where: { plan_id: planId },
    });

    const current = new Set(stops.map((stop) => stop.place_id));
    const requested = new Set(data.place_ids);

    const sameSet =
      requested.size === data.place_ids.length &&
      requested.size === current.size &&
      [...requested].every((id) => current.has(id));

    if (!sameSet) {
      return res.status(400).json({
        message: "place_ids must list every place in the plan exactly once",
      });
    }

    await prisma.$transaction(
      data.place_ids.map((placeId, index) =>
        prisma.visitPlanPlace.updateMany({
          where: { plan_id: planId, place_id: placeId },
          data: { visit_order: index + 1 },
        })
      )
    );

    return res.json({
      message: "Visit order updated",
      place_ids: data.place_ids,
    });
  } catch (error) {
    return sendError(res, error, "Failed to reorder visit plan");
  }
};
