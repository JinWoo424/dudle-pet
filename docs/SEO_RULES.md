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

