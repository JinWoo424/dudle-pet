import { describe, expect, it } from "vitest";
import { detectAnomalies } from "../anomaly";
import { calculatePageQuality, evaluateSeo, monetizationFor, stabilizeSeoStatus } from "../seo";
import { dedupeKey, matchRegion } from "../region";

describe("sync anomaly policy", () => {
  it("전체 20% 초과 감소를 차단한다", () => expect(detectAnomalies({ total: 9400, byRegion: {}, closed: 10, invalidCoordinates: 5 }, { total: 800, byRegion: {}, closed: 10, invalidCoordinates: 5 }).blocked).toBe(true));
  it("정상 소폭 변동은 허용한다", () => expect(detectAnomalies({ total: 100, byRegion: { 여수: 10 }, closed: 2, invalidCoordinates: 2 }, { total: 95, byRegion: { 여수: 9 }, closed: 3, invalidCoordinates: 2 }).blocked).toBe(false));
});

describe("seo and monetization policy", () => {
  it("지역 병원 5건부터 SEO ready다", () => { expect(evaluateSeo({ pageType: "HOSPITAL_REGION", resultCount: 4 })).toBe("NOINDEX_LOW_DATA"); expect(evaluateSeo({ pageType: "HOSPITAL_REGION", resultCount: 5 })).toBe("SEO_READY"); });
  it("검색과 nearby에는 광고가 없다", () => expect(monetizationFor({ pageType: "SEARCH", seoStatus: "NOINDEX_MANUAL", qualityScore: 100 })).toBe("OFF"));
  it("14일 hysteresis로 색인 상태 출렁임을 막는다", () => { expect(stabilizeSeoStatus({ current: "SEO_READY", resultCount: 0, enterAt: 2, retainAt: 1, zeroDays: 13 })).toBe("SEO_READY"); expect(stabilizeSeoStatus({ current: "SEO_READY", resultCount: 0, enterAt: 2, retainAt: 1, zeroDays: 14 })).toBe("NOINDEX_LOW_DATA"); });
  it("page quality는 100점 만점이다", () => expect(calculatePageQuality({ enoughResults: true, coordinates: true, phone: true, verification: true, map: true, nearby: true, fees: true, sourceDate: true, internalLinks: true, uniqueFeature: true })).toBe(100));
});

describe("region and dedupe", () => {
  it("공식 주소를 지역 slug에 연결한다", () => expect(matchRegion("전라남도 여수시 학동 1")).toMatchObject({ status: "MATCHED", slug: "jeonnam/yeosu" }));
  it("source id가 있으면 이름 변화와 무관한 key를 만든다", () => expect(dedupeKey({ source: "MOIS", externalId: "123", name: "A" })).toBe("MOIS:123"));
});

