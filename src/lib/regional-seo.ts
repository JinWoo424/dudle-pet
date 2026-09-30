import type { FacilityKind } from "@/domain/facility";
import type { RegionView } from "@/lib/regions";

export type RegionalSeoStats = {
  total: number;
  coordinateCount: number;
  phoneCount: number;
  addressCount: number;
  averageQuality: number;
  sourceDate?: string;
  syncedAt?: string;
};

const labels: Record<FacilityKind, { primary: string; detail: string }> = {
  ANIMAL_HOSPITAL: { primary: "동물병원", detail: "지도·전화·병원 정보" },
  ANIMAL_PHARMACY: { primary: "동물약국", detail: "지도·주소·전화번호" },
  PET_FUNERAL: { primary: "반려동물 장례식장", detail: "공식 등록시설 정보" },
};

export function regionKeywordName(region?: RegionView | null) {
  if (!region) return "전국";
  if (region.seoName) return region.seoName;
  if (region.level === "PROVINCE" || region.level === "CITY") return region.shortName;
  return region.name;
}

export function regionalPrimaryKeyword(type: FacilityKind, region?: RegionView | null) {
  return `${regionKeywordName(region)} ${labels[type].primary}`;
}

export function regionalTitle(type: FacilityKind, region: RegionView | null | undefined, stats: RegionalSeoStats) {
  const keyword = regionalPrimaryKeyword(type, region);
  return `${keyword} 찾기 | ${stats.total}곳 ${labels[type].detail}`;
}

export function regionalDescription(type: FacilityKind, region: RegionView | null | undefined, stats: RegionalSeoStats) {
  const keyword = regionalPrimaryKeyword(type, region);
  const map = stats.coordinateCount > 0 ? `지도 표시 ${stats.coordinateCount}곳` : "지도 좌표는 확인 중";
  const phone = stats.phoneCount > 0 ? `전화번호 확인 ${stats.phoneCount}곳` : "전화번호는 시설별 확인 필요";
  const date = stats.sourceDate ?? stats.syncedAt ?? "확인 가능한 최신 공식 데이터";
  const purpose = type === "ANIMAL_HOSPITAL"
    ? "병원별 주소·전화번호·위치를 비교하고 상세정보에서 방문 전 확인할 내용을 살펴보세요."
    : type === "ANIMAL_PHARMACY"
      ? "약국별 주소·전화번호·위치를 비교하세요. 동물용 의약품 재고와 판매 가능 여부는 방문 전 약국에 확인하세요."
      : "시설별 주소·전화번호·공식 등록상태를 비교하세요. 장례 절차와 비용은 시설에 직접 확인하세요.";
  return `${keyword} ${stats.total}곳. ${purpose} ${map}, ${phone}. 공식 데이터 기준일 ${date}.`;
}

/** Existing region master only: never invent administrative ancestors. */
export function regionalAncestors(region: RegionView | null | undefined, regions: readonly RegionView[]) {
  const result: RegionView[] = [];
  const visited = new Set<number>(region ? [region.id] : []);
  let parentId = region?.parentId;
  while (parentId !== undefined) {
    const parent = regions.find(candidate => candidate.id === parentId);
    if (!parent || visited.has(parent.id)) break;
    visited.add(parent.id);
    result.unshift(parent);
    parentId = parent.parentId;
  }
  return result;
}

export function regionalVisitGuide(type: FacilityKind, region: RegionView | null | undefined, stats: RegionalSeoStats) {
  const keyword = regionalPrimaryKeyword(type, region);
  const steps = type === "ANIMAL_HOSPITAL"
    ? ["병원명을 선택하면 해당 병원의 주소·전화번호·공식 등록상태를 확인할 수 있습니다.", "진료 대상 동물, 당일 진료시간, 야간·응급 진료 가능 여부는 병원에 전화로 확인하세요. 공식 영업 등록상태는 지금 진료 중이라는 뜻이 아닙니다."]
    : type === "ANIMAL_PHARMACY"
      ? ["약국명을 선택하면 해당 약국의 주소·전화번호·공식 등록상태를 확인할 수 있습니다.", "필요한 동물용 의약품의 취급·재고와 판매 가능 여부, 당일 운영시간은 약국에 직접 확인하세요. 등록정보만으로 재고를 판단할 수 없습니다."]
      : ["시설명을 선택하면 해당 장례시설의 주소·전화번호·공식 등록상태를 확인할 수 있습니다.", "예약 가능 시간, 장례·화장 절차, 이동 지원 여부와 항목별 비용은 시설에 직접 확인하세요. 등록정보만으로 서비스 제공 여부를 판단할 수 없습니다."];
  return {
    heading: `${keyword} 방문 전 확인 방법`,
    coverage: `${stats.total}곳 중 주소 확인 ${stats.addressCount}곳, 전화번호 확인 ${stats.phoneCount}곳, 지도 좌표 확인 ${stats.coordinateCount}곳입니다. 좌표가 없는 시설도 목록에서 확인할 수 있습니다.`,
    steps,
  };
}

export function regionalSummary(type: FacilityKind, region: RegionView | null | undefined, stats: RegionalSeoStats) {
  const keyword = regionalPrimaryKeyword(type, region);
  return `${keyword}은 공식 등록상 영업 상태로 ${stats.total}곳이 확인됩니다. 주소가 확인된 시설은 ${stats.addressCount}곳, 좌표가 확인되어 지도에 표시되는 시설은 ${stats.coordinateCount}곳, 전화번호가 확인된 시설은 ${stats.phoneCount}곳입니다.`;
}

export function regionalSeoQuality(stats: RegionalSeoStats) {
  if (stats.total === 0) return 0;
  const coordinateCoverage = stats.coordinateCount / stats.total;
  const phoneCoverage = stats.phoneCount / stats.total;
  const addressCoverage = stats.addressCount / stats.total;
  const volume = Math.min(30, stats.total >= 30 ? 30 : stats.total);
  return Math.round(
    volume
      + coordinateCoverage * 20
      + phoneCoverage * 15
      + addressCoverage * 15
      + Math.min(20, stats.averageQuality / 5),
  );
}
