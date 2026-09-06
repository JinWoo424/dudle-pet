export interface RegionView { id: number; parentId?: number; level: "PROVINCE" | "CITY" | "DISTRICT"; name: string; shortName: string; fullSlug: string; aliases?: string[]; aliasSlugs?:string[] }
export const developmentRegions: RegionView[] = [
 { id: 1, level: "PROVINCE", name: "전라남도", shortName: "전남", fullSlug: "jeonnam" },
 { id: 2, parentId: 1, level: "CITY", name: "여수시", shortName: "여수", fullSlug: "jeonnam/yeosu" },
 { id: 3, parentId: 1, level: "CITY", name: "순천시", shortName: "순천", fullSlug: "jeonnam/suncheon" },
 { id: 4, level: "PROVINCE", name: "광주광역시", shortName: "광주", fullSlug: "gwangju" },
 { id: 5, level: "PROVINCE", name: "서울특별시", shortName: "서울", fullSlug: "seoul" },
 { id: 6, level: "PROVINCE", name: "부산광역시", shortName: "부산", fullSlug: "busan" },
 { id: 7, parentId: 1, level: "CITY", name: "광양시", shortName: "광양", fullSlug: "jeonnam/gwangyang" },
];
export const featureKeys = { "24h": "open_24h", night: "night_service", exotic: "exotic_service" } as const;
export type Feature = keyof typeof featureKeys;
export function parseFacilityRoute(segments: string[]) {
 const parts = [...segments]; let id: string | undefined; let feature: Feature | undefined;
 if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parts.at(-1) ?? "")) id = parts.pop();
 else if (Object.hasOwn(featureKeys,parts.at(-1)??"")) feature = parts.pop() as Feature;
 if (parts.length > 3 || parts.some(p => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p))) return null;
 return { fullSlug: parts.join("/"), id, feature };
}
