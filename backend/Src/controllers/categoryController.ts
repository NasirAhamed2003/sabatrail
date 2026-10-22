import { Request, Response } from "express";
import { prisma } from "../prisma";
import { idParam, parseOrRespond, sendError } from "../http";
import { categorySchema } from "../validation";
import { Prisma } from "../generated/prisma/client";

// A clearer message than the generic duplicate error
function duplicateName(error: unknown, res: Response, name: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    res.status(409).json({
      message: `A category called "${name}" already exists`,
      errors: { category_name: `A category called "${name}" already exists` },
    });
    return true;
  }

  return false;
}

// Get all categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        category_id: "asc",
      },
      include: {
        _count: {
          select: { places: true },
        },
      },
    });

    res.json(categories);
  } catch (error) {
    sendError(res, error, "Failed to get categories");
  }
};

// Get one category
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const categoryId = parseOrRespond(idParam, req.params.id, res);
    if (categoryId === null) return;

    const category = await prisma.category.findUnique({
      where: {
        category_id: categoryId,
      },
    });

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    res.json(category);
  } catch (error) {
    sendError(res, error, "Failed to get category");
  }
};

// Create a category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const data = parseOrRespond(categorySchema, req.body, res);
    if (!data) return;

    const category = await prisma.category.create({
      data,
    });

    res.status(201).json(category);
  } catch (error) {
    if (duplicateName(error, res, String(req.body?.category_name ?? "").trim())) return;
    sendError(res, error, "Failed to create category");
  }
};

// Update a category
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = parseOrRespond(idParam, req.params.id, res);
    if (categoryId === null) return;

    const data = parseOrRespond(categorySchema, req.body, res);
    if (!data) return;

    const category = await prisma.category.update({
      where: {
        category_id: categoryId,
      },
      data,
    });

    res.json(category);
  } catch (error) {
    if (duplicateName(error, res, String(req.body?.category_name ?? "").trim())) return;
    sendError(res, error, "Failed to update category", "Category not found");
  }
};

// Delete a category
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = parseOrRespond(idParam, req.params.id, res);
    if (categoryId === null) return;

    const category = await prisma.category.findUnique({
      where: { category_id: categoryId },
      include: { _count: { select: { places: true } } },
    });

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    // Only unused categories can be removed (FR-057)
    const placeCount = category._count.places;

    if (placeCount > 0) {
      return res.status(409).json({
        message: `"${category.category_name}" is used by ${placeCount} ${placeCount === 1 ? "place" : "places"}. Move ${placeCount === 1 ? "it" : "them"} to another category before deleting it.`,
        place_count: placeCount,
      });
    }

    await prisma.category.delete({
      where: {
        category_id: categoryId,
      },
    });

    res.json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    sendError(res, error, "Failed to delete category", "Category not found");
  }
};
