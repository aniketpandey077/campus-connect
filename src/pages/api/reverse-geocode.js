export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing latitude or longitude parameters" });
  }

  try {
    // Call Nominatim from the server side with a proper User-Agent header
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      {
        headers: {
          "User-Agent": "UnihoodCampusConnectApp/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim returned status ${response.status}`);
    }

    const data = await response.json();
    if (data && data.address) {
      const state = data.address.state || "";
      const city = data.address.city || data.address.town || data.address.village || data.address.county || data.address.suburb || "";
      return res.status(200).json({ state, city });
    } else {
      return res.status(404).json({ error: "No address resolved" });
    }
  } catch (err) {
    console.error("Server-side reverse geocoding failed:", err);
    // Fallback to BigDataCloud from the server side if Nominatim fails
    try {
      const fallbackResponse = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        const state = fallbackData.principalSubdivision || "";
        const city = fallbackData.city || fallbackData.locality || "";
        return res.status(200).json({ state, city });
      }
    } catch (fallbackErr) {
      console.error("Server-side fallback geocoding failed:", fallbackErr);
    }
    return res.status(500).json({ error: "Reverse geocoding failed" });
  }
}
