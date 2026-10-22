import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { distanceFromTownKm, formatDuration } from "../geo";
import { idParam, parseOrRespond, sendError } from "../http";
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

    const place = await prisma.place.update({
      where: {
        place_id: placeId,
      },
      data: toPlaceData(data),
      include: {
        category: true,
      },
    });

    res.json(place);
  } catch (error) {
    sendError(res, error, "Failed to update place", "Place not found");
  }
};

// Delete a place
export const deletePlace = async (req: Request, res: Response) => {
  try {
    const placeId = parseOrRespond(idParam, req.params.id, res);
    if (placeId === null) return;

    await prisma.place.delete({
      where: {
        place_id: placeId,
      },
    });

    res.json({
      message: "Place deleted successfully",
    });
  } catch (error) {
    sendError(res, error, "Failed to delete place", "Place not found");
  }
};
