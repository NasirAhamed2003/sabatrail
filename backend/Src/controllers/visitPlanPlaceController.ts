
import { Response } from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/authMiddleware";

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

    const planId = Number(req.params.planId);
    const { place_id, visit_order, planned_time } = req.body;

    // Validate plan ID
    if (!Number.isInteger(planId) || planId <= 0) {
      return res.status(400).json({
        message: "Invalid plan ID",
      });
    }

    // Validate place ID
    const placeId = Number(place_id);

    if (!Number.isInteger(placeId) || placeId <= 0) {
      return res.status(400).json({
        message: "A valid place ID is required",
      });
    }

    // Check that the visit plan belongs to the logged-in user
    const visitPlan = await prisma.visitPlan.findFirst({
      where: {
        plan_id: planId,
        user_id: req.user.user_id,
      },
    });

    if (!visitPlan) {
      return res.status(404).json({
        message: "Visit plan not found",
      });
    }

    // Check that the place exists
    const place = await prisma.place.findUnique({
      where: {
        place_id: placeId,
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
        place_id: placeId,
      },
    });

    if (existingPlanPlace) {
      return res.status(409).json({
        message: "Place is already added to this visit plan",
      });
    }

    // Determine the visit order
    const order = visit_order === undefined
      ? 1
      : Number(visit_order);

    if (!Number.isInteger(order) || order <= 0) {
      return res.status(400).json({
        message: "Visit order must be a positive integer",
      });
    }

    // Create the plan-place relationship
    const planPlace = await prisma.visitPlanPlace.create({
      data: {
        plan_id: planId,
        place_id: placeId,
        visit_order: order,
        planned_time: planned_time || null,
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
    console.error("Error adding place to visit plan:", error);

    return res.status(500).json({
      message: "Failed to add place to visit plan",
    });
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

    const planId = Number(req.params.planId);

    // Validate plan ID
    if (!Number.isInteger(planId) || planId <= 0) {
      return res.status(400).json({
        message: "Invalid plan ID",
      });
    }

    // Check that the visit plan belongs to the logged-in user
    const visitPlan = await prisma.visitPlan.findFirst({
      where: {
        plan_id: planId,
        user_id: req.user.user_id,
      },
    });

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
      total_places: planPlaces.length,
      places: planPlaces,
    });
  } catch (error) {
    console.error("Error getting places in visit plan:", error);

    return res.status(500).json({
      message: "Failed to get places in visit plan",
    });
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

    const planId = Number(req.params.planId);
    const placeId = Number(req.params.placeId);

    // Validate the visit plan ID
    if (!Number.isInteger(planId) || planId <= 0) {
      return res.status(400).json({
        message: "Invalid plan ID",
      });
    }

    // Validate the place ID
    if (!Number.isInteger(placeId) || placeId <= 0) {
      return res.status(400).json({
        message: "Invalid place ID",
      });
    }

    // Check that the visit plan belongs to the logged-in user
    const visitPlan = await prisma.visitPlan.findFirst({
      where: {
        plan_id: planId,
        user_id: req.user.user_id,
      },
    });

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

    // Remove the place from the visit plan
    await prisma.visitPlanPlace.delete({
      where: {
        plan_place_id: planPlace.plan_place_id,
      },
    });

    return res.json({
      message: "Place removed from visit plan successfully",
      plan_id: planId,
      place_id: placeId,
    });
  } catch (error) {
    console.error("Error removing place from visit plan:", error);

    return res.status(500).json({
      message: "Failed to remove place from visit plan",
    });
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

    const planId = Number(req.params.planId);
    const placeId = Number(req.params.placeId);

    // Validate IDs
    if (!Number.isInteger(planId) || planId <= 0) {
      return res.status(400).json({
        message: "Invalid plan ID",
      });
    }

    if (!Number.isInteger(placeId) || placeId <= 0) {
      return res.status(400).json({
        message: "Invalid place ID",
      });
    }

    const { visit_order, planned_time } = req.body;

    // Require at least one field to update
    if (visit_order === undefined && planned_time === undefined) {
      return res.status(400).json({
        message: "Provide visit_order or planned_time to update",
      });
    }

    // Check that the plan belongs to the logged-in user
    const visitPlan = await prisma.visitPlan.findFirst({
      where: {
        plan_id: planId,
        user_id: req.user.user_id,
      },
    });

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

    // Prepare the fields to update
    const updateData: {
      visit_order?: number;
      planned_time?: string | null;
    } = {};

    if (visit_order !== undefined) {
      const order = Number(visit_order);

      if (!Number.isInteger(order) || order <= 0) {
        return res.status(400).json({
          message: "Visit order must be a positive integer",
        });
      }

      updateData.visit_order = order;
    }

    if (planned_time !== undefined) {
      if (
        planned_time !== null &&
        typeof planned_time !== "string"
      ) {
        return res.status(400).json({
          message: "Planned time must be a string or null",
        });
      }

      updateData.planned_time = planned_time;
    }

    // Update the selected place in the visit plan
    const updatedPlanPlace = await prisma.visitPlanPlace.update({
      where: {
        plan_place_id: existingPlanPlace.plan_place_id,
      },
      data: updateData,
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
    console.error("Error updating visit plan place:", error);

    return res.status(500).json({
      message: "Failed to update visit plan place",
    });
  }
};
