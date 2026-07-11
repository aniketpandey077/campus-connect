import { rateLimit } from "../../../lib/rateLimit";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limit: 5 requests per minute per IP
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anonymous";
  if (!rateLimit(ip, 5, 60000)) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ error: "PIN is required" });
  }

  const expectedPin = process.env.ADMIN_PIN || "campusadmin123";
  if (pin === expectedPin) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ success: false, error: "Incorrect passcode" });
  }
}
