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

  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone and OTP are required" });
  }

  const expectedOtp = process.env.MOCK_OTP || "123456";
  if (otp === expectedOtp) {
    return res.status(200).json({ success: true, phone, mock: true });
  } else {
    return res.status(400).json({ error: "Invalid OTP." });
  }
}

