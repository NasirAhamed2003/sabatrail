// Location helpers: Haversine distance and Google Maps directions links

export interface LatLng {
  latitude: number;
  longitude: number;
}

// Hemmathagama town centre (OpenStreetMap node 1831898259)
export const HEMMATHAGAMA: LatLng = { latitude: 7.1738895, longitude: 80.4998611 };

// Fixed starting location used throughout the app (no live GPS)
export const FIXED_LOCATION: LatLng = { latitude: 7.174416729272072, longitude: 80.50056487584725 };

// Great-circle distance in kilometres (Haversine formula)
export function haversineKm(from: LatLng, to: LatLng) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLon / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const point = (p: LatLng) => `${p.latitude},${p.longitude}`;

// Google Maps directions to a place. Always uses FIXED_LOCATION as the origin
// unless an explicit origin is provided.
export function directionsUrl(to: LatLng, from?: LatLng | null) {
  const origin = from ?? FIXED_LOCATION;
  const params = new URLSearchParams({ api: "1", destination: point(to), travelmode: "driving" });
  params.set("origin", point(origin));

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// Whole-day route in Google Maps (origin, up to 9 waypoints, destination)
export function routeUrl(stops: LatLng[], from?: LatLng | null) {
  if (stops.length === 0) return null;

  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1).slice(0, 9);

  const origin = from ?? FIXED_LOCATION;
  const params = new URLSearchParams({ api: "1", destination: point(destination), travelmode: "driving" });
  params.set("origin", point(origin));
  if (waypoints.length > 0) params.set("waypoints", waypoints.map(point).join("|"));

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function hasCoordinates(p: Partial<LatLng> | null | undefined): p is LatLng {
  return (
    p != null &&
    Number.isFinite(Number(p.latitude)) &&
    Number.isFinite(Number(p.longitude))
  );
}
