import { VercelRequest, VercelResponse } from "@vercel/node";
import * as cheerio from "cheerio";
import { addLog } from "../utils/logger";
import {
  ALLOWED_ORIGINS,
  CORS_HEADERS,
  ALLOWED_METHODS,
  HTTP_STATUS,
  ERROR_MESSAGES,
} from "../consts";

/**
 * Extracts clean text content from a webpage URL
 * @param url - The URL to extract text from
 * @returns Promise<string> - The extracted clean text content
 */
async function extractWebpageText(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch URL: ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove script and style elements
  $("script, style, noscript, iframe, nav, footer, header, aside").remove();

  // Remove common non-content elements
  $(
    ".sidebar, .advertisement, .ads, .social-share, .comments, .related-posts"
  ).remove();
  $("#sidebar, #ads, #comments, #social-share, #related-posts").remove();

  // Try to find main content areas first
  let text = "";
  const contentSelectors = [
    "main",
    "article",
    '[role="main"]',
    ".main-content",
    ".content",
    ".post-content",
    ".entry-content",
    ".article-content",
  ];

  // Look for main content containers
  for (const selector of contentSelectors) {
    const contentElement = $(selector);
    if (contentElement.length > 0) {
      text = contentElement.text();
      break;
    }
  }

  // Fallback to body if no main content found
  if (!text) {
    text = $("body").text();
  }

  // Clean up the text
  return text
    .replace(/\s+/g, " ") // Replace multiple whitespace with single space
    .replace(/\n\s*\n/g, "\n") // Remove empty lines
    .trim();
}

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
    res.setHeader(CORS_HEADERS.METHODS, "POST, OPTIONS");
    res.setHeader(CORS_HEADERS.HEADERS, "Content-Type");
    res.status(HTTP_STATUS.OK).end();
    return;
  }

  // Validate request method
  console.log("Received request", { method: req.method });
  addLog("Received request", "info", { method: req.method });
  if (req.method !== ALLOWED_METHODS.POST) {
    console.log("Rejected non-POST request");
    addLog("Rejected non-POST request", "warn", { method: req.method });
    res
      .status(HTTP_STATUS.METHOD_NOT_ALLOWED)
      .json({ error: ERROR_MESSAGES.METHOD_NOT_ALLOWED });
    return;
  }

  // Validate request body
  const { url } = req.body || {};
  if (!url || typeof url !== "string") {
    console.log("Invalid or missing url", { url });
    addLog("Invalid or missing url", "error", { url });
    res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ error: ERROR_MESSAGES.MISSING_URL });
    return;
  }

  try {
    console.log("Extracting text from URL", { url });
    addLog("Extracting text from URL", "info", { url });
    const text = await extractWebpageText(url);
    console.log("Text extraction completed", { textLength: text.length });
    addLog("Text extraction completed", "info", { textLength: text.length, url });
    res.status(HTTP_STATUS.OK).json({ text });
  } catch (error) {
    console.error("Error during text extraction", error);
    addLog("Error during text extraction", "error", { error: String(error), url });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_MESSAGES.EXTRACT_TEXT_ERROR,
      details: String(error),
    });
  }
}
