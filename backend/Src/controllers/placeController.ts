import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { distanceFromTownKm, formatDuration } from "../geo";
import { idParam, parseOrRespond, sendError } from "../http";
import { removeLocalUpload } from "../uploads";
import { placeSchema } from "../validation";

// Turn validated input into database fields. Distance is always computed
// from the coordinates (Haversine), never typed in by hand.
function toPlaceData(data: z.infer<typeof placeSchema>) {
  return {
    ...data,
    distance: distanceFromTownKm(data),
    visit_duration: formatDuration(data.visit_duration_minutes),
  };
}

// Get all places
export const getPlaces = async (req: Request, res: Response) => {
  try {
    const places = await prisma.place.findMany({
      include: {
        category: true,
      },
      orderBy: {
        place_id: "asc",
      },
    });

    res.json(places);
  } catch (error) {
    sendError(res, error, "Failed to get places");
  }
};

// Get one place
export const getPlaceById = async (req: Request, res: Response) => {
  try {
    const placeId = parseOrRespond(idParam, req.params.id, res);
    if (placeId === null) return;

    const place = await prisma.place.findUnique({
      where: {
        place_id: placeId,
      },
      include: {
        category: true,
      },
    });

    if (!place) {
      return res.status(404).json({
        message: "Place not found",
      });
    }

    res.json(place);
  } catch (error) {
    sendError(res, error, "Failed to get place");
  }
};

// Create a place
export const createPlace = async (req: Request, res: Response) => {
  try {
    const data = parseOrRespond(placeSchema, req.body, res);
    if (!data) return;

    const category = await prisma.category.findUnique({
      where: {
        category_id: data.category_id,
      },
    });

    if (!category) {
      return res.status(400).json({
        message: "Category not found",
        errors: { category_id: "Category not found" },
      });
    }

    const place = await prisma.place.create({
      data: toPlaceData(data),
      include: {
        category: true,
      },
    });

    res.status(201).json(place);
  } catch (error) {
    sendError(res, error, "Failed to create place");
  }
};

// Update a place
export const updatePlace = async (req: Request, res: Response) => {
  try {
    const placeId = parseOrRespond(idParam, req.params.id, res);
    if (placeId === null) return;

    const data = parseOrRespond(placeSchema, req.body, res);
    if (!data) return;

    const category = await prisma.category.findUnique({
      where: {
        category_id: data.category_id,
      },
    });

    if (!category) {
      return res.status(400).json({
        message: "Category not found",
        errors: { category_id: "Category not found" },
      });
    }

    const previous = await prisma.place.findUnique({
      where: { place_id: placeId },
      select: { image: true },
    });

    const place = await prisma.place.update({
      where: {
        place_id: placeId,
      },
      data: toPlaceData(data),
      include: {
        category: true,
      },
    });

    // A replaced uploaded photo is no longer used; external URLs are left alone
    if (previous?.image && previous.image !== place.image) {
      await removeLocalUpload(previous.image);
    }

    res.json(place);
  } catch (error) {
    sendError(res, error, "Failed to update place", "Place not found");
  }
};

// How many visit plans include a place (shown before deleting it)
export const getPlaceUsage = async (req: Request, res: Response) => {
  try {
    const placeId = parseOrRespond(idParam, req.params.id, res);
    if (placeId === null) return;

    const place = await prisma.place.findUnique({
      where: { place_id: placeId },
      include: { _count: { select: { plan_places: true } } },
    });

    if (!place) {
      return res.status(404).json({
        message: "Place not found",
      });
    }

    res.json({ place_id: placeId, plan_count: place._count.plan_places });
  } catch (error) {
    sendError(res, error, "Failed to get place usage");
  }
};

// Delete a place. If visitors have it in their plans, the request is
// refused (409) unless ?force=true, which also removes it from those plans.
export const deletePlace = async (req: Request, res: Response) => {
  try {
    const placeId = parseOrRespond(idParam, req.params.id, res);
    if (placeId === null) return;

    const place = await prisma.place.findUnique({
      where: { place_id: placeId },
      include: { _count: { select: { plan_places: true } } },
    });

    if (!place) {
      return res.status(404).json({
        message: "Place not found",
      });
    }

    const planCount = place._count.plan_places;
    const force = req.query.force === "true";

    if (planCount > 0 && !force) {
      return res.status(409).json({
        message: `"${place.place_name}" is in ${planCount} visitor ${planCount === 1 ? "plan" : "plans"}. Deleting it will also remove it from ${planCount === 1 ? "that plan" : "those plans"}.`,
        plan_count: planCount,
      });
    }

    await prisma.$transaction([
      prisma.visitPlanPlace.deleteMany({
        where: { place_id: placeId },
      }),
      prisma.place.delete({
        where: { place_id: placeId },
      }),
    ]);

    await removeLocalUpload(place.image);

    res.json({
      message: "Place deleted successfully",
      removed_from_plans: planCount,
    });
  } catch (error) {
    sendError(res, error, "Failed to delete place", "Place not found");
  }
};
