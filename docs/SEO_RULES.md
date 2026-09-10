# SEO 규칙

## 색인

- 지역 병원 5건, 24시간 2건, 야간 3건, 특수동물 3건, 동물약국 5건을 초기 기준으로 한다.
- 진료비는 공식 값이 있을 때, 시설 상세는 이름·지역·주소·공식상태가 있을 때만 준비 상태다.
- 검색, nearby, admin, 오류와 일반 filter query는 `noindex`다.
- 지역명을 치환한 thin page, 근거 없는 추천·순위·최고 표현을 만들지 않는다.

## URL과 canonical

색인 대상은 안정된 path route다. `sort`, `map`, `parking`, `page` query는 canonical path에 합치고 별도 색인하지 않는다. 제목은 코드의 template을 사용한다.

## Sitemap과 내부 링크

`sitemap.ts`에는 색인 기준을 충족한 route만 넣는다. `lastModified`는 실제 데이터·콘텐츠 변경일이며 request 현재시각을 쓰지 않는다. 지역 → feature/약국/진료비, 시설 → 지역/주변/진료비 연결을 유지하고 orphan page를 운영 dashboard에서 확인한다.

## Structured data

시설 상세의 화면에 실제 표시한 이름·주소·전화·좌표만 `LocalBusiness`와 `BreadcrumbList`에 포함한다. 검증된 영업시간이 없으면 `openingHoursSpecification`을 만들지 않는다.
# 현재 적용 상태 (2026-09-05)

실제 공개 색인 승인은 seo_pages의 SEO_READY + manual_hold=false를 기준으로 합니다.
현재 재계산은 빈/낮은 데이터 페이지를 보수적으로 즉시 noindex 처리합니다.
기존 문서/순수 함수의 14일 hysteresis는 현재 DB 재계산 job에 연결되지 않았습니다.
실제 DB에서 재계산·sitemap을 검증한 것은 아닙니다.

## 전국 Regional SEO 원칙 (2026-09-10)

- 지역 landing의 primary keyword는 `{지역명} 동물병원`, `{지역명} 동물약국`, `{지역명} 반려동물 장례식장`, `{지역명} 동물병원 진료비`다.
- title, description, 상단 안내와 지역 요약은 현재 DB의 OPEN 수, 좌표·전화 보유 수, 공식 데이터 기준일만 사용한다.
- 동명이 지역은 상위 행정구역을 붙여 canonical별 title을 구분한다. 의미 없는 랜덤 문장이나 지역 관광 설명은 만들지 않는다.
- 화면에 보이는 시설만 `ItemList`에 포함한다. 시설 상세는 실제 name/address/phone/geo 외의 영업시간, 서비스, 평점, 후기를 구조화 데이터로 만들지 않는다.
- Province hub에는 현재 기준을 충족한 child region만 노출한다. 페이지네이션은 서버 렌더링 링크로 유지해 30건 이후의 상세 페이지도 발견 가능하게 한다.
- sitemap shard와 URL은 유지한다. `lastmod`는 SEO 재평가 실행 시간이 아니라 원천 시설 수정일 또는 공식 진료비 기준일을 사용한다.
- `seo:audit`의 품질 점수는 영향 분석용이다. 기존 `SEO_READY`를 대량 변경하려면 별도 검토가 필요하다.

