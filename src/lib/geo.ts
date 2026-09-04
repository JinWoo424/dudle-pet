import proj4 from "proj4";

proj4.defs("EPSG:5174", "+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +towgs84=-146.43,507.89,681.46 +units=m +no_defs");

export function validateWgs84(latitude?: number | null, longitude?: number | null) {
  if (latitude == null || longitude == null) return "MISSING" as const;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "INVALID" as const;
  if (latitude < 32 || latitude > 39 || longitude < 124 || longitude > 132) return "REVIEW_REQUIRED" as const;
  return "VALID" as const;
}

export function transform5174To4326(x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("좌표는 유한한 숫자여야 합니다.");
  const [longitude, latitude] = proj4("EPSG:5174", "EPSG:4326", [x, y]);
  return { latitude, longitude, status: validateWgs84(latitude, longitude) };
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

