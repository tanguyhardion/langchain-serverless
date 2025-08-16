// Health check endpoint for serverless deployment
export default function handler(req, res) {
  // CORS headers
  const allowedOrigins = [
    "https://tanguyhardion.github.io",
    "http://localhost:3000",
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "none");
  }
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
