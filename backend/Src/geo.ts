// ===============================
// LOCATION HELPERS
// ===============================

// Hemmathagama town centre (OpenStreetMap node 1831898259)
export const HEMMATHAGAMA = { latitude: 7.1738895, longitude: 80.4998611 };

// Great-circle distance in kilometres (Haversine formula)
export function haversineKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLon / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Distance from the town centre, rounded to 0.1 km
export function distanceFromTownKm(point: { latitude: number; longitude: number }) {
  return Math.round(haversineKm(HEMMATHAGAMA, point) * 10) / 10;
}

// "90" -> "1 h 30 min" (kept in the legacy visit_duration column for display)
export function formatDuration(minutes: number | null | undefined) {
  if (minutes == null) return null;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;

  return `${hours} h ${rest} min`;
}
