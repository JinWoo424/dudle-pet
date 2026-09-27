import type { FacilityView } from "@/domain/facility";

type SearchFacts = Pick<FacilityView, "name" | "province" | "city" | "roadAddress" | "phone" | "type" | "businessStatus">;

export function facilitySearchMetadata(facility: SearchFacts) {
  const metropolitan = /(?:광역시|특별시|특별자치시)$/.test(facility.province);
  const region = metropolitan
    ? facility.province.replace(/특별자치시$|광역시$|특별시$/, "")
    : facility.city.replace(/시$/, "");
  const name = facility.name.startsWith(region) ? facility.name : `${region} ${facility.name}`.trim();
  const title = `${name} | ${facility.phone ? "전화번호·" : ""}주소·위치`;
  const facts = [
    facility.roadAddress.trim() ? `주소: ${facility.roadAddress.trim()}.` : "",
    facility.phone?.trim() ? `전화: ${facility.phone.trim()}.` : "",
  ].filter(Boolean).join(" ");
  const notice = facility.businessStatus === "OPEN"
    ? facility.type === "ANIMAL_HOSPITAL"
      ? "방문 전 진료시간과 진료 가능 여부를 확인하세요."
      : facility.type === "ANIMAL_PHARMACY"
        ? "방문 전 영업시간과 동물용 의약품 취급 여부를 확인하세요."
        : "방문 전 운영시간과 이용 가능 여부를 확인하세요."
    : "현재 이용 가능 여부는 시설에 직접 확인하세요.";
  return { title, description: `${name}. ${facts} ${notice}`.replace(/\s+/g, " ").trim() };
}
