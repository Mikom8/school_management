// Central API configuration
// In production: uses VITE_API_URL from .env.production
// In development: falls back to localhost:5000
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default API_BASE_URL;
