import type { FacilityView, FeeStatisticView } from "@/domain/facility";

const base = {
  province: "전남",
  city: "여수",
  businessStatus: "OPEN" as const,
  sourceName: "행정안전부 공공데이터 (개발용 가상 데이터)",
  sourceDate: "2026-09-01",
};

const unknown = { open24h: "UNKNOWN", nightService: "UNKNOWN", exoticService: "UNKNOWN", catService: "UNKNOWN", parkingAvailable: "UNKNOWN", verificationStatus: "UNVERIFIED" } as const;

export const mockFacilities: FacilityView[] = [
  { ...base, id: "10000000-0000-4000-8000-000000000001", type: "ANIMAL_HOSPITAL", name: "두들동물병원 A", phone: "061-000-1001", roadAddress: "전남 여수시 시청로 10", district: "학동", legalDong: "학동", latitude: 34.7604, longitude: 127.6622, features: { open24h: "YES", nightService: "YES", exoticService: "NO", catService: "YES", parkingAvailable: "YES", verificationStatus: "VALID", verifiedAt: "2026-08-20", sourceLabel: "ADMIN_MANUAL (개발용)" } },
  { ...base, id: "10000000-0000-4000-8000-000000000002", type: "ANIMAL_HOSPITAL", name: "두들동물병원 B", phone: "061-000-1002", roadAddress: "전남 여수시 망마로 24", district: "학동", legalDong: "학동", latitude: 34.7631, longitude: 127.6598, features: { ...unknown, nightService: "YES", catService: "YES", parkingAvailable: "YES", verificationStatus: "VALID", verifiedAt: "2026-08-18", sourceLabel: "OFFICIAL_WEBSITE (개발용)" } },
  { ...base, id: "10000000-0000-4000-8000-000000000003", type: "ANIMAL_HOSPITAL", name: "두들동물병원 C", phone: "061-000-1003", roadAddress: "전남 여수시 웅천로 88", district: "웅천동", legalDong: "웅천동", latitude: 34.7449, longitude: 127.6737, features: { ...unknown, open24h: "YES", nightService: "YES", catService: "YES", verificationStatus: "VALID", verifiedAt: "2026-08-14", sourceLabel: "PHONE_CONFIRMATION (개발용)" } },
  { ...base, id: "10000000-0000-4000-8000-000000000004", type: "ANIMAL_HOSPITAL", name: "두들동물병원 D", phone: "061-000-1004", roadAddress: "전남 여수시 여서로 41", district: "여서동", legalDong: "여서동", latitude: 34.7523, longitude: 127.7051, features: { ...unknown, exoticService: "YES", parkingAvailable: "YES", verificationStatus: "VALID", verifiedAt: "2026-07-21", sourceLabel: "OFFICIAL_WEBSITE (개발용)" } },
  { ...base, id: "10000000-0000-4000-8000-000000000005", type: "ANIMAL_HOSPITAL", name: "두들동물병원 E", roadAddress: "전남 여수시 중앙로 105", district: "중앙동", legalDong: "중앙동", latitude: 34.7396, longitude: 127.7332, features: unknown },
  { ...base, id: "10000000-0000-4000-8000-000000000006", type: "ANIMAL_HOSPITAL", name: "두들동물병원 F", phone: "061-000-1006", roadAddress: "전남 여수시 돌산읍 강남로 7", district: "돌산읍", legalDong: "우두리", latitude: 34.7157, longitude: 127.7441, features: unknown },
  { ...base, id: "10000000-0000-4000-8000-000000000007", type: "ANIMAL_HOSPITAL", name: "두들동물병원 G", phone: "061-000-1007", roadAddress: "전남 여수시 소라면 덕양로 31", district: "소라면", legalDong: "덕양리", latitude: 34.7934, longitude: 127.6365, features: unknown },
  { ...base, id: "10000000-0000-4000-8000-000000000008", type: "ANIMAL_HOSPITAL", name: "두들동물병원 H", phone: "061-000-1008", roadAddress: "전남 여수시 문수로 52", district: "문수동", legalDong: "문수동", latitude: 34.7582, longitude: 127.7004, features: unknown },
  ...[1, 2, 3, 4, 5].map((number, index): FacilityView => ({ ...base, id: `20000000-0000-4000-8000-00000000000${number}`, type: "ANIMAL_PHARMACY", name: `두들동물약국 ${String.fromCharCode(64 + number)}`, phone: `061-000-200${number}`, roadAddress: `전남 여수시 ${["학동", "웅천동", "여서동", "중앙동", "문수동"][index]}로 ${12 + index * 9}`, district: ["학동", "웅천동", "여서동", "중앙동", "문수동"][index], latitude: 34.75 + index * .004, longitude: 127.66 + index * .011, features: unknown })),
  ...[1, 2].map((number, index): FacilityView => ({ ...base, id: `30000000-0000-4000-8000-00000000000${number}`, type: "PET_FUNERAL", name: `두들반려동물장례 ${String.fromCharCode(64 + number)}`, phone: `061-000-300${number}`, roadAddress: `전남 여수시 ${index ? "율촌면" : "소라면"} 산업로 ${80 + index * 30}`, district: index ? "율촌면" : "소라면", latitude: 34.82 + index * .03, longitude: 127.59 + index * .04, features: unknown })),
];

const prices: Array<[string, string, number, number, number, number]> = [
  ["consultation", "초진 진찰료", 8000, 12000, 13200, 25000], ["vaccination", "개 종합백신", 20000, 30000, 32500, 50000],
  ["blood-test", "전혈구 검사", 25000, 40000, 43800, 75000], ["xray", "X-ray", 30000, 50000, 56800, 100000],
  ["ultrasound", "초음파", 40000, 70000, 77400, 150000], ["ct", "CT", 250000, 450000, 502000, 900000], ["mri", "MRI", 450000, 700000, 782000, 1300000],
];

export const mockFeeStatistics: FeeStatisticView[] = prices.flatMap(([itemCode, itemName, minimumPrice, medianPrice, averagePrice, maximumPrice]) => [
  { categoryCode:"MOCK",itemCode, itemName, region: "여수", regionLevel: "CITY", surveyYear: 2025, minimumPrice, medianPrice, averagePrice, maximumPrice, sampleCount: 18, sourceName: "공식 진료비 조사 (개발용 가상 통계)" },
  { categoryCode:"MOCK",itemCode, itemName, region: "전남", regionLevel: "PROVINCE", surveyYear: 2025, minimumPrice, medianPrice: Math.round(medianPrice * 1.04), averagePrice: Math.round(averagePrice * 1.03), maximumPrice, sampleCount: 92, sourceName: "공식 진료비 조사 (개발용 가상 통계)" },
  { categoryCode:"MOCK",itemCode, itemName, region: "전국", regionLevel: "NATIONAL", surveyYear: 2025, minimumPrice, medianPrice: Math.round(medianPrice * 1.12), averagePrice: Math.round(averagePrice * 1.14), maximumPrice, sampleCount: 1240, sourceName: "공식 진료비 조사 (개발용 가상 통계)" },
]);
