export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone and OTP are required" });
  }
  if (otp === "123456") {
    return res.status(200).json({ success: true, phone, mock: true });
  } else {
    return res.status(400).json({ error: "Invalid OTP. Use 123456 for now (mock mode)." });
  }
}
