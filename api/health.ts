import { 
  ALLOWED_ORIGINS,
  CORS_HEADERS,
  ALLOWED_METHODS,
  HTTP_STATUS,
  ERROR_MESSAGES 
} from "../consts";

// Health check endpoint for serverless deployment
export default function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader(CORS_HEADERS.ORIGIN, origin);
  } else {
    res.setHeader(CORS_HEADERS.ORIGIN, "none");
  }
  // Handle preflight OPTIONS request
  if (req.method === ALLOWED_METHODS.OPTIONS) {
    res.status(HTTP_STATUS.OK).end();
    return;
  }

  // Validate request method
  if (req.method === ALLOWED_METHODS.GET) {
    res.status(HTTP_STATUS.OK).json({ status: "ok", timestamp: new Date().toISOString() });
  } else {
    res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({ error: ERROR_MESSAGES.METHOD_NOT_ALLOWED });
  }
}
