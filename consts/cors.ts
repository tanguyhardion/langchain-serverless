/**
 * CORS configuration constants
 */
export const ALLOWED_ORIGINS = [
  "https://tanguyhardion.github.io",
];

export const CORS_HEADERS = {
  METHODS: "Access-Control-Allow-Methods",
  HEADERS: "Access-Control-Allow-Headers",
  ORIGIN: "Access-Control-Allow-Origin",
} as const;

export const ALLOWED_METHODS = {
  GET: "GET",
  POST: "POST",
  OPTIONS: "OPTIONS",
} as const;

export const ALLOWED_REQUEST_HEADERS = "Content-Type, Authorization";
