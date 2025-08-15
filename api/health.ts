// Health check endpoint for serverless deployment
export default function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Validate request method
  if (req.method === "GET") {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
