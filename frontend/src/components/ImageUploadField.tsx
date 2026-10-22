import { useRef, useState, type DragEvent } from "react";
import api, { assetUrl } from "../api";
import { apiErrorMessage } from "../lib/errors";
import Alert from "./ui/Alert";
import { Button } from "./ui/Button";
import Icon from "./ui/Icon";

// Admin place photo: upload a file (drag and drop or "Choose image") or paste
// an external image URL. Whichever was set last is the value. Uploaded files
// are stored by the API as "/uploads/<file>".

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

// Same rules and messages as the server (POST /api/uploads)
function checkFile(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) return "Upload a JPEG, PNG or WebP image";
  if (file.size > MAX_BYTES) return "Image must be 5 MB or smaller";
  return "";
}

export default function ImageUploadField({
  id,
  value,
  error,
  onChange,
}: {
  id: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const isExternal = /^https?:\/\//i.test(value.trim());

  const isUpload = value.trim().startsWith("/uploads/");

  const [urlMode, setUrlMode] = useState(isExternal);
  const [urlText, setUrlText] = useState(isExternal ? value : "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [failedSrc, setFailedSrc] = useState("");

  const message = uploadError || error;
  const errorId = message ? `${id}-error` : undefined;
  const preview = assetUrl(value.trim());

  const upload = async (file: File | undefined) => {
    if (!file) return;

    const problem = checkFile(file);
    setUploadError(problem);
    if (problem) return;

    const form = new FormData();
    form.append("image", file);
    setUploading(true);

    try {
      // multipart/form-data replaces the instance's JSON default; the browser adds the boundary
      const response = await api.post<{ url: string }>("/uploads", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(response.data.url);
      setUrlText("");
      setUrlMode(false);
    } catch (uploadFailure) {
      setUploadError(apiErrorMessage(uploadFailure, "Couldn't upload this image. Please try again."));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!uploading) void upload(event.dataTransfer.files[0]);
  };

  const chooseFile = () => fileInput.current?.click();

  return (
    <div className="field form-wide image-field">
      <label htmlFor={id}>Upload a photo</label>

      <input
        ref={fileInput}
        id={id}
        type="file"
        accept="image/*"
        className="visually-hidden"
        tabIndex={-1}
        aria-describedby={[errorId, `${id}-hint`].filter(Boolean).join(" ")}
        aria-invalid={message ? true : undefined}
        onChange={(event) => void upload(event.target.files?.[0])}
      />

      {isExternal || isUpload ? (
        <figure className="image-preview">
          {failedSrc === preview ? (
            <Alert tone="warning">This image didn&apos;t load. Check the address or upload a file instead.</Alert>
          ) : (
            <img src={preview} alt="Preview of the place's photo" onError={() => setFailedSrc(preview ?? "")} />
          )}
          <figcaption className="muted">{isExternal ? "Image from the web" : "Uploaded photo"}</figcaption>
          <div className="image-preview-actions">
            <Button variant="secondary" size="sm" onClick={chooseFile} disabled={uploading}>
              <Icon name="upload" size={16} /> Replace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange("");
                setUploadError("");
              }}
              disabled={uploading}
            >
              Remove
            </Button>
          </div>
        </figure>
      ) : (
        <div
          className={["upload-drop", dragging && "is-dragging"].filter(Boolean).join(" ")}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <Icon name="upload" size={24} />
          <p>Drag a photo here, or</p>
          <Button variant="secondary" onClick={chooseFile} disabled={uploading}>
            Choose image
          </Button>
        </div>
      )}

      <p className="field-hint" id={`${id}-hint`}>
        JPEG, PNG or WebP, up to 5 MB.
      </p>

      {uploading && (
        <p className="upload-status" role="status">
          <span className="spinner" aria-hidden="true" /> Uploading…
        </p>
      )}

      {message && (
        <p className="field-error" id={errorId}>
          {message}
        </p>
      )}

      <button type="button" className="link-button" onClick={() => setUrlMode((open) => !open)} aria-expanded={urlMode}>
        {urlMode ? "Hide the image URL field" : "Or paste an image URL"}
      </button>

      {urlMode && (
        <div className="field">
          <label htmlFor={`${id}-url`}>Image URL</label>
          <input
            id={`${id}-url`}
            className="input"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={urlText}
            onChange={(event) => {
              setUrlText(event.target.value);
              onChange(event.target.value);
              setUploadError("");
            }}
          />
        </div>
      )}
    </div>
  );
}
