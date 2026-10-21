import { Request, Response } from "express";
import { prisma } from "../prisma";

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
    console.error("Error getting categories:", error);

    res.status(500).json({
      message: "Failed to get categories",
    });
  }
};

// Get one category
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const categoryId = Number(req.params.id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        message: "Invalid category ID",
      });
    }

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
    console.error("Error getting category:", error);

    res.status(500).json({
      message: "Failed to get category",
    });
  }
};

// Create a category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { category_name, description } = req.body;

    if (!category_name || category_name.trim() === "") {
      return res.status(400).json({
        message: "Category name is required",
      });
    }

    const category = await prisma.category.create({
      data: {
        category_name: category_name.trim(),
        description: description || null,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error("Error creating category:", error);

    res.status(500).json({
      message: "Failed to create category",
    });
  }
};

// Update a category
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = Number(req.params.id);
    const { category_name, description } = req.body;

    if (isNaN(categoryId)) {
      return res.status(400).json({
        message: "Invalid category ID",
      });
    }

    if (!category_name || category_name.trim() === "") {
      return res.status(400).json({
        message: "Category name is required",
      });
    }

    const category = await prisma.category.update({
      where: {
        category_id: categoryId,
      },
      data: {
        category_name: category_name.trim(),
        description: description || null,
      },
    });

    res.json(category);
  } catch (error) {
    console.error("Error updating category:", error);

    res.status(500).json({
      message: "Failed to update category",
    });
  }
};

// Delete a category
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = Number(req.params.id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        message: "Invalid category ID",
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
    console.error("Error deleting category:", error);

    res.status(500).json({
      message: "Failed to delete category",
    });
  }
};