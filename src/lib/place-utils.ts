// Shared helpers for turning place info into map / image / distance data.
// Uses only free public endpoints so nothing needs a key.

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Deep link into Google Maps directions from the user's current location. */
export function directionsUrl(
  name: string,
  city?: string,
  coords?: { lat: number; lng: number } | null,
) {
  const dest = encodeURIComponent(`${name}${city ? `, ${city}` : ""}`);
  const origin = coords ? `&origin=${coords.lat},${coords.lng}` : "";
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}${origin}&travelmode=driving`;
}

/** Google Maps search deep link (falls back if directions can't resolve). */
export function mapsSearchUrl(name: string, city?: string) {
  const q = encodeURIComponent(`${name}${city ? `, ${city}` : ""}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Get current location coordinates and city based on IP address as a fallback. */
export async function fetchIpLocation(): Promise<{ lat: number; lng: number; city?: string } | null> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) throw new Error("IP geolocation service failed");
    const data = await res.json();
    if (data && typeof data.latitude === "number" && typeof data.longitude === "number") {
      return {
        lat: data.latitude,
        lng: data.longitude,
        city: data.city || undefined,
      };
    }
  } catch (e) {
    console.error("IP Geolocation failed:", e);
  }
  return null;
}

/** Returns a real Flickr photo tagged with dynamic, category-specific tags matching the place name.
 * Fallback when Wikipedia has no image. Avoids generic pictures by querying robust tags groups. */
export function photoUrl(name: string, city?: string, w = 800, h = 1000) {
  const lowerName = name.toLowerCase();
  let keyword = "travel";

  if (lowerName.includes("coffee") || lowerName.includes("cafe") || lowerName.includes("tea")) {
    keyword = "cafe";
  } else if (
    lowerName.includes("food") ||
    lowerName.includes("restaurant") ||
    lowerName.includes("eat") ||
    lowerName.includes("biryani") ||
    lowerName.includes("street-food") ||
    lowerName.includes("dining") ||
    lowerName.includes("diner")
  ) {
    keyword = "food";
  } else if (lowerName.includes("beach") || lowerName.includes("sea") || lowerName.includes("coast") || lowerName.includes("ocean")) {
    keyword = "beach";
  } else if (
    lowerName.includes("temple") ||
    lowerName.includes("church") ||
    lowerName.includes("mosque") ||
    lowerName.includes("cathedral") ||
    lowerName.includes("memorial") ||
    lowerName.includes("monument") ||
    lowerName.includes("fort") ||
    lowerName.includes("palace")
  ) {
    keyword = "monument";
  } else if (lowerName.includes("park") || lowerName.includes("garden") || lowerName.includes("forest") || lowerName.includes("nature") || lowerName.includes("lake") || lowerName.includes("hill")) {
    keyword = "nature";
  } else if (lowerName.includes("market") || lowerName.includes("bazaar") || lowerName.includes("shop") || lowerName.includes("mall") || lowerName.includes("street")) {
    keyword = "bazaar";
  } else if (lowerName.includes("station") || lowerName.includes("metro") || lowerName.includes("airport") || lowerName.includes("train") || lowerName.includes("bus")) {
    keyword = "metro";
  } else {
    // If no keyword matched, clean up the place name and take the first two words
    const cleanName = name
      .replace(/[^\w\s]/g, "")
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .slice(0, 2)
      .join("-");
    if (cleanName) {
      keyword = cleanName;
    }
  }

  const cityClean = (city ?? "")
    .replace(/[^\w\s]/g, "")
    .trim()
    .split(/\s+/)[0] || "";

  const tagList = [keyword, cityClean, "travel"]
    .filter(Boolean)
    .join(",")
    .toLowerCase();

  const seed = hash(name + (city ?? "")) % 1000;
  return `https://loremflickr.com/${w}/${h}/${encodeURIComponent(tagList)}?random=${seed}`;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** window.open with a graceful fallback for iframe/sandbox contexts where popups are blocked. */
export function openExternal(url: string) {
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) return true;
  } catch {
    /* ignore */
  }
  // Fallback — synthesize an anchor and click it (usually escapes iframe popup blockers).
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}

/** Forward-geocode a free-text place to lat/lng via OpenStreetMap Nominatim (no key). */
export async function geocode(
  query: string,
): Promise<{ lat: number; lng: number; display: string } | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } },
    );
    const j = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!j.length) return null;
    return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon), display: j[0].display_name };
  } catch {
    return null;
  }
}
