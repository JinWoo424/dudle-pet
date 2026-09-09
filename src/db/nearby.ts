import { getSql } from "./connection";

export interface NearbyRow {
  id: string;
  name: string;
  facility_type: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
}

export async function findNearbyFacilities(input: { latitude: number; longitude: number; radiusMeters: number; facilityType?: string; limit?: number }) {
  if (!process.env.DATABASE_URL) return [] as NearbyRow[];
  return getSql()<NearbyRow[]>`
    SELECT id, name, facility_type, latitude, longitude,
           ST_Distance(location, ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography) AS distance_meters
    FROM facilities
    WHERE is_active = true
      AND location IS NOT NULL
      AND (${input.facilityType ?? null}::text IS NULL OR facility_type::text = ${input.facilityType ?? null})
      AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)::geography, ${input.radiusMeters})
    ORDER BY distance_meters ASC
    LIMIT ${Math.min(input.limit ?? 50, 100)}
  `;
}

