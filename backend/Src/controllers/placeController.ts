import { Request, Response } from "express";
import { prisma } from "../prisma";

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
    console.error("Error getting places:", error);

    res.status(500).json({
      message: "Failed to get places",
    });
  }
};

// Get one place
export const getPlaceById = async (req: Request, res: Response) => {
  try {
    const placeId = Number(req.params.id);

    if (isNaN(placeId)) {
      return res.status(400).json({
        message: "Invalid place ID",
      });
    }

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
    console.error("Error getting place:", error);

    res.status(500).json({
      message: "Failed to get place",
    });
  }
};

// Create a place
export const createPlace = async (req: Request, res: Response) => {
  try {
    const {
      category_id,
      place_name,
      description,
      address,
      latitude,
      longitude,
      distance,
      opening_time,
      closing_time,
      best_time_to_visit,
      visit_duration,
      suitability,
      travel_tips,
      facilities,
      image,
    } = req.body;

    if (!category_id || !place_name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: "category_id, place_name, latitude and longitude are required",
      });
    }

    const category = await prisma.category.findUnique({
      where: {
        category_id: Number(category_id),
      },
    });

    if (!category) {
      return res.status(400).json({
        message: "Category not found",
      });
    }

    const place = await prisma.place.create({
      data: {
        category_id: Number(category_id),
        place_name: place_name.trim(),
        description: description || null,
        address: address || null,
        latitude: Number(latitude),
        longitude: Number(longitude),
        distance: distance !== undefined ? Number(distance) : null,
        opening_time: opening_time || null,
        closing_time: closing_time || null,
        best_time_to_visit: best_time_to_visit || null,
        visit_duration: visit_duration || null,
        suitability: suitability || null,
        travel_tips: travel_tips || null,
        facilities: facilities || null,
        image: image || null,
      },
      include: {
        category: true,
      },
    });

    res.status(201).json(place);
  } catch (error) {
    console.error("Error creating place:", error);

    res.status(500).json({
      message: "Failed to create place",
    });
  }
};

// Update a place
export const updatePlace = async (req: Request, res: Response) => {
  try {
    const placeId = Number(req.params.id);

    if (isNaN(placeId)) {
      return res.status(400).json({
        message: "Invalid place ID",
      });
    }

    const {
      category_id,
      place_name,
      description,
      address,
      latitude,
      longitude,
      distance,
      opening_time,
      closing_time,
      best_time_to_visit,
      visit_duration,
      suitability,
      travel_tips,
      facilities,
      image,
    } = req.body;

    if (!category_id || !place_name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: "category_id, place_name, latitude and longitude are required",
      });
    }

    const category = await prisma.category.findUnique({
      where: {
        category_id: Number(category_id),
      },
    });

    if (!category) {
      return res.status(400).json({
        message: "Category not found",
      });
    }

    const place = await prisma.place.update({
      where: {
        place_id: placeId,
      },
      data: {
        category_id: Number(category_id),
        place_name: place_name.trim(),
        description: description || null,
        address: address || null,
        latitude: Number(latitude),
        longitude: Number(longitude),
        distance: distance !== undefined ? Number(distance) : null,
        opening_time: opening_time || null,
        closing_time: closing_time || null,
        best_time_to_visit: best_time_to_visit || null,
        visit_duration: visit_duration || null,
        suitability: suitability || null,
        travel_tips: travel_tips || null,
        facilities: facilities || null,
        image: image || null,
      },
      include: {
        category: true,
      },
    });

    res.json(place);
  } catch (error) {
    console.error("Error updating place:", error);

    res.status(500).json({
      message: "Failed to update place",
    });
  }
};

// Delete a place
export const deletePlace = async (req: Request, res: Response) => {
  try {
    const placeId = Number(req.params.id);

    if (isNaN(placeId)) {
      return res.status(400).json({
        message: "Invalid place ID",
      });
    }

    await prisma.place.delete({
      where: {
        place_id: placeId,
      },
    });

    res.json({
      message: "Place deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting place:", error);

    res.status(500).json({
      message: "Failed to delete place",
    });
  }
};