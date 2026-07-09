export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { phone } = req.body;
  if (!phone || phone.length !== 10) {
    return res.status(400).json({ error: "Enter a valid 10-digit phone number" });
  }
  console.log(`[MOCK] OTP for ${phone} is 123456`);
  return res.status(200).json({ success: true, mock: true });
}
