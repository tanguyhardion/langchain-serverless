// Health check endpoint for serverless deployment
export default function handler(req, res) {
  // CORS headers
  const allowedOrigin = "https://tanguyhardion.github.io";
  const origin = req.headers.origin;
  if (origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
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
