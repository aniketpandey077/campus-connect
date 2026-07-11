// src/lib/rateLimit.js
// Basic in-memory rate limiter for serverless Next.js API routes

const rateLimitMap = new Map();

export function rateLimit(ip, limit = 5, windowMs = 60000) {
  const now = Date.now();
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  // Filter out timestamps older than the window
  const requests = rateLimitMap.get(ip).filter(timestamp => now - timestamp < windowMs);
  
  if (requests.length >= limit) {
    return false;
  }

  requests.push(now);
  rateLimitMap.set(ip, requests);
  return true;
}
