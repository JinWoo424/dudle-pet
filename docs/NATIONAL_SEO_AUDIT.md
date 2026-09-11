# 전국 Organic Search SEO Audit

기준일: 2026-09-11T08:52:26.686Z

## 기준선

| 분류 | 후보 | SEO_READY | noindex |
|---|---:|---:|---:|
| HOSPITAL_REGION | 5351 | 303 | 5048 |
| PHARMACY_REGION | 5351 | 328 | 5023 |
| FUNERAL_REGION | 5351 | 35 | 5316 |
| COST_REGION | 219 | 212 | 7 |
| FACILITY_DETAIL | 29581 | 18916 | 10665 |

지역형 집계는 region_id가 있는 페이지 기준입니다. 전국 root를 포함한 sitemap의 Hospital/Pharmacy/Funeral/Cost 지역 페이지 수는 각각 304/329/36/213입니다.

## Sitemap 기준선

| page_type | URL |
|---|---:|
| COST_ITEM | 3,811 |
| COST_REGION | 213 |
| FACILITY_DETAIL | 18,916 |
| FUNERAL_REGION | 36 |
| HOSPITAL_REGION | 304 |
| PHARMACY_REGION | 329 |
| 합계 | 23,609 |

- P0: 78 pages
- Proposed duplicate titles: 0
- Proposed duplicate descriptions: 0
- Invalid canonical: 0
- P0 orphan: 0 (home/category/parent/detail/pagination graph 기준)

## 발견한 문제

1. 기존 지역 title과 description은 실제 시설 수·좌표 수·기준일을 반영하지 않아 지역 간 차별성이 약했습니다.
2. 지역 목록에는 화면 시설을 설명하는 ItemList 구조화 데이터가 없었습니다.
3. 화면 breadcrumb와 BreadcrumbList 구조화 데이터가 연결되지 않았습니다.
4. 홈의 전국 핵심 지역 HTML 링크가 제한적이었습니다.
5. sitemap lastmod가 SEO 재평가 시각을 사용해 실제 데이터 변경일과 분리되지 않았습니다.

## 적용 설계

- Title: primary keyword를 맨 앞에 두고 실제 OPEN 수와 페이지 목적을 결합합니다.
- H1: canonical당 하나의 지역·시설 유형 primary keyword를 유지합니다.
- Description: 실제 OPEN 수, 좌표·전화 보유 수, 공식 데이터 기준일만 사용합니다.
- 본문: 상단 실제 수치와 하단 공식 데이터 요약을 SSR HTML에 제공합니다.
- Structured data: 화면 breadcrumb는 BreadcrumbList, 현재 화면 시설만 ItemList로 표현합니다. 기존 시설 상세 구조화 데이터는 유지합니다.
- Sitemap lastmod: SEO 평가 시각이 아니라 원천 시설 수정일 또는 공식 진료비 기준일을 사용합니다.

## 품질·noindex 정책

기존 SEO_READY를 대량 변경하지 않았습니다. 신규 audit score는 시설 수, 기존 데이터 품질, 좌표 보유율을 사용하며 상태 변경 전 영향 검토용입니다. Funeral 1~2건 페이지는 기존 noindex 판단을 유지하고, 실제 가치가 확인된 기존 예외만 현 상태를 보존합니다. 검색·정렬·페이지네이션 query, 빈 페이지, REVIEW_REQUIRED, manual hold는 sitemap에 넣지 않습니다.

## 내부 링크와 crawl depth

- Home → 주요 P0 지역: 서버 렌더링 링크
- Category/Province → 데이터 기준을 충족한 child region
- Region → 실제 시설 detail 및 crawl 가능한 pagination
- Detail → 해당 region 전체 보기
- Region ↔ 같은 지역의 Hospital/Pharmacy/Funeral/Cost

P0는 위 그래프에서 고아 URL 0이며 일반적인 핵심 경로 crawl depth는 Home 기준 1~3단계입니다. 30건 이후 시설도 서버 렌더링된 다음 페이지 링크로 발견할 수 있습니다.

## Cannibalization 점검

지역 목록은 `{지역} {시설유형}`, 시설 상세는 고유 업체명, 진료비는 `{지역} 동물병원 진료비`를 primary intent로 분리합니다. 동명이 지역은 상위 행정구역 또는 공식 행정구역명을 붙여 제안 title/description 중복을 0으로 유지합니다. 검색 결과와 feature filter는 별도 index landing으로 승격하지 않습니다.

## Naver·Google 접근성

Production robots의 `User-Agent: * / Allow: /`가 Yeti와 Googlebot의 공개 페이지 접근을 허용합니다. admin, API, search, nearby, report는 계속 차단합니다. sitemap은 production origin만 포함하고 shard당 10,000 URL 이하를 유지합니다.

## Naver URL Inspection 체크리스트

대표 P0 URL에서 HTTP 200, 수집/색인 여부, index 가능, title, description, self-canonical, robots, 서버 렌더링 H1과 시설 링크를 확인합니다. 수집 요청은 Dashboard에서 수동으로 진행합니다.

## 주간 측정

Naver와 Google에서 indexed pages, impressions, clicks, query, CTR, average position, crawl 오류를 매주 같은 요일에 기록합니다. 4주 이동 추세로 비교하며 단기 순위 변동을 성과로 단정하지 않습니다. 검색 순위 상승은 보장하지 않습니다.
