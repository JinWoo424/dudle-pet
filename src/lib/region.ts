const regionAliases: Record<string, { province: string; city?: string; slug: string }> = {
  "전남 여수": { province: "전남", city: "여수", slug: "jeonnam/yeosu" },
  "전라남도 여수시": { province: "전남", city: "여수", slug: "jeonnam/yeosu" },
  "전남 순천": { province: "전남", city: "순천", slug: "jeonnam/suncheon" },
  "광주": { province: "광주", slug: "gwangju" },
  "서울": { province: "서울", slug: "seoul" },
  "부산": { province: "부산", slug: "busan" },
};
export function matchRegion(address: string) { const normalized = address.replace(/\s+/g, " ").trim(); const key = Object.keys(regionAliases).find((alias) => normalized.includes(alias) || normalized.includes(alias.replace("전라남도", "전남").replace("시", ""))); return key ? { status: "MATCHED" as const, ...regionAliases[key] } : { status: "UNMATCHED" as const }; }

export function dedupeKey(input: { source: string; externalId?: string; name: string; address?: string }) { return input.externalId ? `${input.source}:${input.externalId}` : `${input.source}:${input.name.normalize("NFKC").replace(/\s/g, "").toLowerCase()}:${(input.address ?? "").normalize("NFKC").replace(/\s/g, "").toLowerCase()}`; }

