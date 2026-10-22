import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

// ===============================
// LOCAL IMAGE UPLOADS
// Admin photos are stored in backend/uploads as <uuid>.<ext> and served at
// /uploads/<file>. Place.image keeps the relative "/uploads/<file>" path;
// external (e.g. Wikimedia) URLs are stored as they are and never touched.
// ===============================

export const UPLOADS_DIR = path.resolve(__dirname, "..", "uploads");
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// The only shape a local image path can have. Anything else (including
// "../" tricks) is not treated as a local file.
const LOCAL_IMAGE = /^\/uploads\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp))$/;

export function isLocalUpload(image: unknown): image is string {
  return typeof image === "string" && LOCAL_IMAGE.test(image);
}

// Identify the image from its first bytes; the client's filename and
// Content-Type are not trusted.
export function detectImageType(data: Buffer): { mime: string; ext: string } | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: "image/png", ext: "png" };
  }

  if (data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") {
    return { mime: "image/webp", ext: "webp" };
  }

  return null;
}

// Write a validated image and return its public path
export async function saveUpload(data: Buffer, ext: string) {
  const fileName = `${randomUUID()}.${ext}`;

  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, fileName), data, { flag: "wx" });

  return `/uploads/${fileName}`;
}

// Best-effort removal of a replaced or deleted place's local photo. Never
// throws: a leftover file must not fail the request that replaced it.
export async function removeLocalUpload(image: unknown) {
  if (!isLocalUpload(image)) return;

  try {
    const fileName = image.slice("/uploads/".length);
    await fs.unlink(path.join(UPLOADS_DIR, fileName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("Could not remove uploaded image:", image, error);
    }
  }
}
