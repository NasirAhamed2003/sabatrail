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

export default api;
