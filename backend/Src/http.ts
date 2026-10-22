import { Response } from "express";
import { z } from "zod";
import { Prisma } from "./generated/prisma/client";

// ===============================
// SHARED REQUEST / RESPONSE HELPERS
// ===============================

// Validate input with a zod schema. On failure, responds with 400 and the
// first problem per field, and returns null so the caller can stop.
export function parseOrRespond<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
  res: Response
): z.infer<T> | null {
  const result = schema.safeParse(input);

  if (!result.success) {
    const errors: Record<string, string> = {};

    for (const issue of result.error.issues) {
      const field = issue.path.join(".") || "body";
      if (!errors[field]) errors[field] = issue.message;
    }

    res.status(400).json({
      message: Object.values(errors)[0] ?? "Invalid request",
      errors,
    });

    return null;
  }

  return result.data;
}

// Map known database errors to clear HTTP responses. Raw error details are
// logged on the server and never sent to the client.
export function sendError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
  notFoundMessage = "Record not found"
) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: notFoundMessage });
    }

    if (error.code === "P2002") {
      return res.status(409).json({ message: "A record with these details already exists" });
    }

    if (error.code === "P2003") {
      return res.status(409).json({ message: "This record is still in use and cannot be changed" });
    }
  }

  console.error(fallbackMessage, error);

  return res.status(500).json({ message: fallbackMessage });
}

// Route parameter IDs
export const idParam = z.coerce
  .number({ invalid_type_error: "Invalid ID" })
  .int("Invalid ID")
  .positive("Invalid ID");
