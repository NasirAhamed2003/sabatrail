import axios from "axios";

// The API location comes from VITE_API_BASE_URL (see .env.example).
// In development it falls back to the local backend; production builds
// fall back to the same origin's /api path.
const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sabatrail_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// A rejected token (expired or revoked) ends the session everywhere.
// AuthProvider listens for this event and logs the visitor out.
export const SESSION_EXPIRED_EVENT = "sabatrail:session-expired";

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const sentToken = Boolean(error?.config?.headers?.Authorization);

    if (error?.response?.status === 401 && sentToken) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    return Promise.reject(error);
  }
);

// Uploaded place photos are stored as "/uploads/<file>" and served by the API
// server (next to /api). External photo URLs are returned unchanged.
const apiRoot = baseURL.replace(/\/api\/?$/, "");

export function assetUrl(image: string | null | undefined) {
  if (!image) return undefined;
  return image.startsWith("/uploads/") ? `${apiRoot}${image}` : image;
}

export default api;
