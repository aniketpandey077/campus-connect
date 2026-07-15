import { rateLimit } from "../../lib/rateLimit";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limit: 5 requests per minute per IP
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anonymous";
  if (!rateLimit(ip, 5, 60000)) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const { phone } = req.body;
  if (!phone || phone.length !== 10) {
    return res.status(400).json({ error: "Enter a valid 10-digit phone number" });
  }

  const maskedPhone = `XXXXXX${phone.slice(-4)}`;
  console.log(`[MOCK] OTP request processed for ${maskedPhone}`);
  return res.status(200).json({ success: true, mock: true });
}

