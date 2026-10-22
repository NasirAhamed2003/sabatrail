import { Request, Response } from "express";
import multer from "multer";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, detectImageType, saveUpload } from "../uploads";

// The file is held in memory (5 MB at most) and only written to disk once
// its contents are confirmed to be a JPEG, PNG or WebP image.
const receiveImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 0 },
}).single("image");

function reject(res: Response, status: number, message: string) {
  return res.status(status).json({ message, errors: { image: message } });
}

// Upload a place photo (admin only). Returns { url: "/uploads/<file>" }.
export const uploadImage = (req: Request, res: Response) => {
  receiveImage(req, res, async (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return reject(res, 413, "Image must be 5 MB or smaller");
      }

      return reject(res, 400, 'Send a single image in the "image" field');
    }

    if (error) {
      return reject(res, 400, "The upload could not be read");
    }

    const file = req.file;

    if (!file) {
      return reject(res, 400, "Choose an image to upload");
    }

    const detected = detectImageType(file.buffer);

    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype) || !detected) {
      return reject(res, 400, "Upload a JPEG, PNG or WebP image");
    }

    try {
      const url = await saveUpload(file.buffer, detected.ext);
      res.status(201).json({ url });
    } catch (saveError) {
      console.error("Failed to save upload:", saveError);
      res.status(500).json({ message: "Failed to save the image" });
    }
  });
};
