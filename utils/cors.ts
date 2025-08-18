import { VercelRequest, VercelResponse } from "@vercel/node";
import {
  ALLOWED_ORIGINS,
  CORS_HEADERS,
  ALLOWED_METHODS,
  ALLOWED_REQUEST_HEADERS,
  HTTP_STATUS,
  ERROR_MESSAGES,
} from "../consts";

/**
 * CORS and method validation middleware
 * @param req - Vercel request object
 * @param res - Vercel response object
 * @param allowedMethod - The HTTP method this endpoint accepts (GET or POST)
 * @returns true if request should continue, false if it was handled (OPTIONS or invalid method)
 */
export function handleCorsAndMethod(
  req: VercelRequest,
  res: VercelResponse,
  allowedMethod: "GET" | "POST"
): boolean {
  // CORS headers
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader(CORS_HEADERS.ORIGIN, origin);
  } else {
    res.setHeader(CORS_HEADERS.ORIGIN, "none");
  }

  // Handle preflight OPTIONS request
  if (req.method === ALLOWED_METHODS.OPTIONS) {
    res.setHeader(CORS_HEADERS.METHODS, `${allowedMethod}, OPTIONS`);
    res.setHeader(CORS_HEADERS.HEADERS, ALLOWED_REQUEST_HEADERS);
    res.status(HTTP_STATUS.OK).end();
    return false; // Request was handled, don't continue
  }

  // Validate request method
  if (req.method !== allowedMethod) {
    res
      .status(HTTP_STATUS.METHOD_NOT_ALLOWED)
      .json({ error: ERROR_MESSAGES.METHOD_NOT_ALLOWED });
    return false; // Request was handled, don't continue
  }

  return true; // Request should continue
}
