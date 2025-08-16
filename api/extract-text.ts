import { VercelRequest, VercelResponse } from "@vercel/node";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { 
  ALLOWED_ORIGINS,
  CORS_HEADERS,
  ALLOWED_METHODS,
  HTTP_STATUS,
  ERROR_MESSAGES 
} from "../consts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
  if (req.method !== ALLOWED_METHODS.POST) {
    res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({ error: ERROR_MESSAGES.METHOD_NOT_ALLOWED });
    return;
  }

  // Validate request body
  const { url } = req.body || {};
  if (!url || typeof url !== "string") {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_MESSAGES.MISSING_URL });
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_MESSAGES.FAILED_TO_FETCH });
      return;
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    // Extract main text content (simple approach)
    const text = $("body").text().replace(/\s+/g, " ").trim();
    res.status(HTTP_STATUS.OK).json({ text });
  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ error: ERROR_MESSAGES.EXTRACT_TEXT_ERROR, details: String(error) });
  }
}
