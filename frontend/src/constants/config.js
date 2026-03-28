export const API_BASE = 
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000")
    .replace(/\/$/, "");

export const LOGO_PATH = "/Asha-logo.webp";
export const SESSIONS_KEY = "asha-sessions";