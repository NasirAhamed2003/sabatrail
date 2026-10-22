/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Base URL of the SabaTrail API, e.g. http://localhost:5000/api
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
