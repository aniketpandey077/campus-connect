import { INDIA_STATES_CITIES } from "../../lib/indiaStatesCities";

const CITY_SYNONYMS = {
  "noida": "Gautam Buddha Nagar",
  "greater noida": "Gautam Buddha Nagar",
  "gurgaon": "Gurugram",
  "bombay": "Mumbai",
  "madras": "Chennai",
  "calcutta": "Kolkata",
  "banaras": "Varanasi",
  "varanasi cantonment": "Varanasi",
  "pondicherry": "Puducherry",
  "trivandrum": "Thiruvananthapuram",
  "vizag": "Visakhapatnam",
  "gauhati": "Guwahati",
  "baroda": "Vadodara",
  "cochin": "Ernakulam"
};

function findMatchingStateAndCity(resolvedState, resolvedCity) {
  if (!resolvedState) return { state: "", city: "" };

  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const resolvedStateClean = clean(resolvedState);

  // 1. Match State
  const matchedState = Object.keys(INDIA_STATES_CITIES).find(st => {
    const stClean = clean(st);
    return stClean === resolvedStateClean || stClean.includes(resolvedStateClean) || resolvedStateClean.includes(stClean);
  }) || "";

  if (!matchedState) {
    return { state: "", city: "" };
  }

  // Translate Synonyms
  if (resolvedCity) {
    const cleanCityWithSpaces = resolvedCity.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    for (const [syn, official] of Object.entries(CITY_SYNONYMS)) {
      if (cleanCityWithSpaces === syn || cleanCityWithSpaces.includes(syn)) {
        resolvedCity = official;
        break;
      }
    }
  }

  // 2. Match City
  let matchedCity = "";
  if (resolvedCity) {
    const cities = INDIA_STATES_CITIES[matchedState] || [];
    const resolvedCityClean = clean(resolvedCity);

    // Try exact clean match
    matchedCity = cities.find(ct => clean(ct) === resolvedCityClean);

    // Try partial match (one contains the other)
    if (!matchedCity) {
      const matches = cities.filter(ct => {
        const ctClean = clean(ct);
        return resolvedCityClean.includes(ctClean) || ctClean.includes(resolvedCityClean);
      });
      if (matches.length > 0) {
        matchedCity = matches.find(m => m.toLowerCase().includes("nagar") || m.toLowerCase().includes("urban")) || matches[0];
      }
    }

    // Try word-by-word prefix match
    if (!matchedCity) {
      const rawWords = resolvedCity.split(/[^a-zA-Z0-9]+/);
      if (rawWords.length > 0) {
        const firstWordClean = clean(rawWords[0]);
        if (firstWordClean.length >= 3) {
          const matches = cities.filter(ct => {
            const ctClean = clean(ct);
            return ctClean.startsWith(firstWordClean);
          });
          if (matches.length > 0) {
            matchedCity = matches.find(m => m.toLowerCase().includes("nagar") || m.toLowerCase().includes("urban")) || matches[0];
          }
        }
      }
    }
  }

  return { state: matchedState, city: matchedCity || "" };
}

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
      const rawState = data.address.state || "";
      const rawCity = data.address.city || data.address.town || data.address.village || data.address.county || data.address.suburb || "";
      
      const { state, city } = findMatchingStateAndCity(rawState, rawCity);
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
        const rawState = fallbackData.principalSubdivision || "";
        const rawCity = fallbackData.city || fallbackData.locality || "";
        
        const { state, city } = findMatchingStateAndCity(rawState, rawCity);
        return res.status(200).json({ state, city });
      }
    } catch (fallbackErr) {
      console.error("Server-side fallback geocoding failed:", fallbackErr);
    }
    return res.status(500).json({ error: "Reverse geocoding failed" });
  }
}

