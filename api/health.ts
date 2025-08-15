// Health check endpoint for serverless deployment
export default function handler(req, res) {
    // CORS: Allow only specific domains
    const allowedOrigins = [
      "http://localhost:3000",
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    } else {
      res.status(403).json({ error: "Forbidden: Origin not allowed" });
      return;
    }
  if (req.method === "GET") {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
