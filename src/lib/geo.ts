export function validateWgs84(latitude?: number | null, longitude?: number | null) {
  if (latitude == null || longitude == null) return "MISSING" as const;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "INVALID" as const;
  if (latitude < 32 || latitude > 39 || longitude < 124 || longitude > 132) return "REVIEW_REQUIRED" as const;
  return "VALID" as const;
}

export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radius = 6_371_000;
  const toRadians = (value: number) => value * Math.PI / 180;
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const haversine = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
