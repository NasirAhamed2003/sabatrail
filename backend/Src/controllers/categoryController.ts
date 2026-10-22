import { Request, Response } from "express";
import { prisma } from "../prisma";
import { idParam, parseOrRespond, sendError } from "../http";
import { categorySchema } from "../validation";

// Get all categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        category_id: "asc",
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
    sendError(res, error, "Failed to update category", "Category not found");
  }
};

// Delete a category
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = parseOrRespond(idParam, req.params.id, res);
    if (categoryId === null) return;

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
