import { HTTP_STATUS } from "../consts";
import { handleCorsAndMethod } from "../utils/cors";

// Health check endpoint for serverless deployment
export default function handler(req, res) {
  // Handle CORS and method validation
  if (!handleCorsAndMethod(req, res, "GET")) {
    return;
  }

  // Health check response
  res
    .status(HTTP_STATUS.OK)
    .json({ status: "ok", timestamp: new Date().toISOString() });
}
