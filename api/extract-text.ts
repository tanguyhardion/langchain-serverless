import { VercelRequest, VercelResponse } from "@vercel/node";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Validate request method
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Validate request body
  const { url } = req.body || {};
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Missing or invalid url" });
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      res.status(400).json({ error: "Failed to fetch the URL" });
      return;
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    // Extract main text content (simple approach)
    const text = $("body").text().replace(/\s+/g, " ").trim();
    res.status(200).json({ text });
  } catch (error) {
    res.status(500).json({ error: "Error extracting text", details: String(error) });
  }
}
