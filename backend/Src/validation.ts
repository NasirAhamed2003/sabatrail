import { z } from "zod";
import { isLocalUpload } from "./uploads";

// ===============================
// REQUEST VALIDATION SCHEMAS
// ===============================

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

// Optional text: empty strings become null, other values must be strings
const optionalText = (max: number) =>
  z
    .string({ invalid_type_error: "Must be text" })
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .nullish()
    .transform((value) => (value ? value : null));

const requiredText = (label: string, max: number) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);

// 24-hour "HH:MM" time, or empty for none
const optionalTime = z
  .string({ invalid_type_error: "Time must be text" })
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time, e.g. 08:30")
  .or(z.literal(""))
  .nullish()
  .transform((value) => (value ? value : null));

// Numbers from forms: "" and null count as "not provided" instead of coercing to 0
const blankToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const requiredNumber = (message: string) =>
  z.preprocess(blankToUndefined, z.coerce.number({ invalid_type_error: message }));

// ---------- Auth ----------

export const registerSchema = z.object({
  name: requiredText("Name", 100),
  email: z
    .string({ required_error: "Email is required", invalid_type_error: "Email must be text" })
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .max(191),
  password: z
    .string({ required_error: "Password is required", invalid_type_error: "Password must be text" })
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be 128 characters or fewer")
    .regex(/[A-Za-z]/, "Password must include a letter")
    .regex(/\d/, "Password must include a number"),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email and password are required", invalid_type_error: "Email must be text" })
    .trim()
    .toLowerCase()
    .min(1, "Email and password are required"),
  password: z
    .string({ required_error: "Email and password are required", invalid_type_error: "Password must be text" })
    .min(1, "Email and password are required"),
});

// ---------- Categories ----------

export const categorySchema = z.object({
  category_name: requiredText("Category name", 100),
  description: optionalText(191),
});

// ---------- Places ----------

export const placeSchema = z.object({
  category_id: z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ invalid_type_error: "Choose a category" })
      .int("Choose a category")
      .positive("Choose a category")
  ),
  place_name: requiredText("Place name", 150),
  description: optionalText(5000),
  address: optionalText(191),
  latitude: requiredNumber("Latitude must be a number")
    .pipe(z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90")),
  longitude: requiredNumber("Longitude must be a number")
    .pipe(z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180")),
  opening_time: optionalTime,
  closing_time: optionalTime,
  best_time_to_visit: optionalText(191),
  visit_duration_minutes: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.coerce
      .number({ invalid_type_error: "Visit duration must be a number of minutes" })
      .int("Visit duration must be whole minutes")
      .min(5, "Visit duration must be at least 5 minutes")
      .max(720, "Visit duration must be 12 hours or less")
      .nullable()
  ),
  suitability: optionalText(191),
  travel_tips: optionalText(5000),
  facilities: optionalText(5000),
  before_you_go: optionalText(5000),
  // Either an uploaded photo ("/uploads/<uuid>.<ext>") or an external web address
  image: z
    .string({ invalid_type_error: "Image must be a URL" })
    .trim()
    .max(2000, "Image URL is too long")
    .refine(
      (value) => value === "" || isLocalUpload(value) || isHttpUrl(value),
      "Image must be an uploaded photo or a web address starting with http:// or https://"
    )
    .nullish()
    .transform((value) => (value ? value : null)),
  image_credit: optionalText(191),
});

// ---------- Visit plans ----------

const visitDate = z
  .string({ required_error: "Visit date is required", invalid_type_error: "Visit date must be text" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Visit date must be YYYY-MM-DD")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Visit date is not a valid date");

export const createPlanSchema = z.object({
  plan_name: requiredText("Plan name", 100),
  visit_date: visitDate,
});

export const updatePlanSchema = z
  .object({
    plan_name: requiredText("Plan name", 100).optional(),
    visit_date: visitDate.optional(),
  })
  .refine((data) => data.plan_name !== undefined || data.visit_date !== undefined, {
    message: "Provide plan_name or visit_date to update",
  });

export const addPlanPlaceSchema = z.object({
  place_id: z.coerce
    .number({ invalid_type_error: "A valid place ID is required" })
    .int("A valid place ID is required")
    .positive("A valid place ID is required"),
  visit_order: z.coerce
    .number({ invalid_type_error: "Visit order must be a positive integer" })
    .int("Visit order must be a positive integer")
    .positive("Visit order must be a positive integer")
    .optional(),
  planned_time: optionalTime,
});

export const updatePlanPlaceSchema = z
  .object({
    visit_order: z.coerce
      .number({ invalid_type_error: "Visit order must be a positive integer" })
      .int("Visit order must be a positive integer")
      .positive("Visit order must be a positive integer")
      .optional(),
    planned_time: optionalTime.optional(),
  })
  .refine((data) => data.visit_order !== undefined || data.planned_time !== undefined, {
    message: "Provide visit_order or planned_time to update",
  });

export const reorderSchema = z.object({
  place_ids: z
    .array(z.coerce.number().int().positive(), { invalid_type_error: "place_ids must be a list" })
    .min(1, "place_ids must not be empty"),
});
