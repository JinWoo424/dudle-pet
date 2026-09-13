# 두들펫 SEO·지역 탐색 기반 감사 및 1차 구현

기준일: 2026-09-13. 기획서 47절의 1–7단계만 수행했다. 작업 브랜치는 `codex/naver-related-links`이며 Production 배포, Git push, DB migration/import, 환경변수 변경은 하지 않았다. 루트 작업 디렉터리의 기존 portability 변경은 보존했다.

## A. 현재 구조

| 계층 | 확인한 구조 |
|---|---|
| 앱 | Next.js 16.3.3 App Router, React 19, TypeScript, Node.js |
| 운영 | Vercel + Supabase PostgreSQL/PostGIS |
| DB 접근 | Drizzle schema + postgres.js, Transaction Pooler, singleton, prepare:false, max:4, CA/TLS 검증 유지 |
| 라우팅 | hospital/pharmacy/funeral/cost catch-all, 지역 full_slug와 시설 ID, 기존 지역 alias redirect |
| 콘텐츠 | 서버 렌더링 지역 목록·시설 상세·공식 진료비, 홈·정책·가이드, 지도/검색 클라이언트 구성요소 |
| 데이터 | 공공데이터 raw/정규화/좌표변환/지역매핑/중복처리, 공식 진료비 조사연도·동물·체중·역사적 지역 보존 |
| SEO | seo_pages 승인 상태, canonical, Breadcrumb/시설 JSON-LD, Production/Preview robots 분리, sitemap 분할 |

Organic landing 유형은 지역별 병원·약국·장례 목록, 시설 상세, 지역 진료비, 진료비 항목, 근거가 확인된 특수 운영정보, 가이드로 구분된다. API/검색 필터/관리 화면은 별도 역할이며 무조건 색인 대상이 아니다.

DB 읽기 감사 결과: 활성 지역 5,351개, SEO 레코드 65,859개, 승인 canonical 23,609개. 승인 유형은 병원 지역 304, 약국 지역 329, 장례 지역 36, 시설 상세 18,916, 진료비 지역 213, 진료비 항목 3,811개였다. 자체 승인 지역 페이지가 있는 지역은 374개다. 승인 24시/야간/특수동물 페이지는 이번 조회에서 없었다.

## B. 문제와 중요도

| 중요도 | 발견 | 처리 |
|---|---|---|
| Critical | 이번 범위에서 새로 확인한 치명적 장애 없음 | 전체 운영 무장애를 의미하지 않음 |
| High | 기존 정렬은 212개 지역에서 진료비 링크 8개가 관련 탐색을 독점 | 서비스 유형 우선순위와 중복 제거 적용 |
| High | 상세의 지역 slug만으로 진료비 URL을 만들어 미승인/무데이터 목적지로 연결 가능 | 승인 레코드의 canonical만 사용, 상위 지역 명시 |
| High | 기존 seo-audit의 orphanP0가 측정 없이 0으로 고정 | null 및 NOT_MEASURED로 변경; 전체 렌더 그래프 검사 필요 |
| Medium | 진료비와 병원/약국/장례 사이 일관된 왕복 탐색 부족 | 공통 지역 관련 정보 컴포넌트 적용 |
| Medium | 가이드의 상세 canonical/공유 메타데이터와 짧은 콘텐츠 품질 보강 여지 | 별도 콘텐츠 단계로 남김; 얇은 페이지 대량 색인하지 않음 |
| Medium | 지역 breadcrumbs의 조상 지역 탐색, 검색의 비용/시설 의도 구분 부족 | 후속 설계 대상으로 기록 |
| Medium | 전체 페이지뷰/관련 탐색/비교 전환 측정 범위 불완전 | 실제 GA 설정 확인·개인정보 없는 이벤트 설계 필요 |
| Low | 근거 없는 '많이 찾는' 홈 표현, 오래된 24시 지역 링크 | 중립 표현 및 방문 전 확인 가이드로 변경 |

## C. 구현

- 후보 데이터 → 순수 연결 규칙 → 서버 UI의 세 계층으로 분리했다.
- 같은 지역의 병원/약국/장례/진료비를 먼저 보여주고, 남는 자리에 승인된 세부 진료비 등을 최대 8개 제공한다.
- 같은 지역에 승인 목적지가 없으면 가장 가까운 승인 상위 지역을 사용하며 실제 지역명과 '상위 지역'을 표시한다. 임의 인접 도시를 추천하지 않는다.
- 자기 자신, 같은 서비스의 중복, 같은 항목, 외부 origin, query/hash, 인증정보가 있는 URL을 제외한다.
- 병원 상세 진료비는 병원 실제 견적이 아닌 지역 통계임을 유지하고 동물/체중 조건을 읽을 수 있게 표시한다.
- 새 route나 키워드 조합 페이지는 만들지 않았다. 기존 URL·DB·가격·영업정보는 변경하지 않았다.

## D. 연결 및 확장 계약

`기존 지역 목록/시설 상세/진료비 → RegionalJourney → 동일 지역 승인 서비스 → 없으면 명시적인 상위 지역`

기존 `regions(parent_id/full_slug)`와 aliases, `seo_pages(seo_status/manual_hold/canonical_url)`, 시설 검증/운영시간, 공식 진료비 및 import batch를 재사용한다. 신규 migration은 필요하지 않다. `RegionalPageCandidate`와 `RegionalJourneyLink`가 읽기 모델 계약이며 이 UI에 DB driver를 직접 결합하지 않는다.

Priority A는 검증된 운영시간·서비스·출처·확인일·유효기간을 바탕으로 확장해야 한다. 서비스 제공 여부, 현재 영업 여부, 공식 등록상태는 서로 다른 개념이다. 근거 없는 야간/일요일/중성화 가격/리뷰/제휴를 생성하지 않는다. 제휴 모델은 실제 계약과 고지 정책이 마련된 후 별도로 설계한다.

## E. SEO 정책

- 기존 title/description/canonical/robots/JSON-LD 생성과 sitemap 정책을 유지했다.
- DB 감사에서 잘못된 canonical origin/지역 route/중복 canonical은 0건이었다.
- 지역 링크는 SEO_READY, manual_hold=false, 활성 지역만 대상으로 한다.
- Preview noindex와 Production 승인 기반 index 정책은 변경하지 않았다.
- 23,609는 DB 승인 URL 수다. 이번 작업에서 Production sitemap 전체를 재다운로드하거나 모든 페이지의 실제 index 상태를 검증한 수치가 아니다.
- 16개 로컬 실제 렌더 표본에서 제목/설명/H1 중복, canonical origin 오류, JSON-LD 구문 오류는 없었다. 검색엔진 리치결과 적격성이나 전체 사이트 중복 0을 보장하지 않는다.
- 전체 사이트 orphan은 미측정이다. 신규 관련 링크 생성 검사와 전체 렌더 링크 그래프 검사를 혼동하지 않는다.

## F. 사용자 흐름

병원을 찾은 뒤 지역 진료비 또는 약국으로 이동하고, 진료비에서 다시 지역 병원 목록으로 돌아갈 수 있다. 장례는 해당 지역에 승인 페이지가 없을 때 상위 지역임을 명확히 표시한다. 기존 상세의 PostGIS 주변 약국과 Kakao 동작은 수정하지 않았다.

여수 병원 페이지의 375/390/430/1440 viewport에서 연결 카드 8개, 화면 밖 카드 0, 가로 overflow 0을 확인했다. 브라우저에서 관련 링크를 클릭하여 여수 약국 51곳 페이지 도착도 확인했다. 이번 로컬 빌드에는 Kakao 클라이언트 키가 없어 지도 fallback이 표시되었으므로 실제 marker 회귀 통과로 보고하지 않는다.

## G. 수익화·분석

AdSense 5개 수동 배치, bootstrap, 품질/Preview 게이트는 변경하지 않았다. 광고 추가·클릭 유도·Auto Ads 설정·제휴 링크·Google/Naver 계정 설정은 하지 않았다. 로컬 QA에서는 광고 요청을 끄고 검사했다. 실제 광고 fill/수익·체류시간 개선은 아직 측정되지 않았다. 향후 관련 정보 클릭/비교 완료/전화·길찾기 이벤트는 개인정보를 제외하고 정책 검토 후 추가한다.

## H. 검증 범위

- lint/typecheck/build 통과. secret scan 235개 파일 검사, findings 0건. git diff --check 통과.
- 단위 테스트: 89 passed, 1 skipped. 실제 전국 sync 통합 테스트는 의도적으로 실행하지 않았다.
- `audit-regional-journey.ts`: 실제 DB 읽기만 사용, 활성 지역 전체 계산. 신규 링크 중복 경로/중복 표시명/미승인 목적지 0.
- `qa-regional-journey.mjs`: localhost 전용. 서울/부산/여수 4개 카테고리와 홈, 병원 상세 3개 등 총 16개 페이지 및 본문 내부 링크 365개 확인, 오류 0. query 링크 및 관리/API/신고는 이 링크 검사에서 제외한다.
- 운영 DB 쓰기, 전국 import/sync, Production 부하 시험은 하지 않았다.
- 결과 파일: `docs/reports/regional-journey-audit.json`, `docs/reports/regional-journey-http.json`.

## I. 변경 파일 전체

1. `src/lib/related-seo-links.ts` — 승인 링크 정규화/표시명.
2. `src/lib/regional-journey.ts` — 지역/상위 지역 연결 규칙.
3. `src/data/seo-repository.ts` — 승인 후보 조회와 기존 우선순위 수정.
4. `src/components/navigation/regional-journey.tsx` — 공통 SSR 탐색 UI.
5. `src/components/facility/facility-directory.tsx` — 목록 연결 및 정확한 통계 목적지.
6. `src/components/facility/facility-detail.tsx` — 상세 연결/진료비 조건 표시.
7. `src/app/cost/[[...segments]]/page.tsx` — 비용에서 서비스로 이동.
8. `src/app/page.tsx` — 24시 가이드 연결/중립 문구.
9. `src/app/globals.css` — 관련 탐색 반응형 스타일.
10. `src/lib/__tests__/related-seo-links.test.ts` — 정규화 테스트.
11. `src/lib/__tests__/regional-journey.test.ts` — 우선순위/상위 지역/안전 규칙 테스트.
12. `scripts/audit-regional-journey.ts` — 전국 DB 읽기 감사.
13. `scripts/qa-regional-journey.mjs` — 로컬 렌더/내부 링크 감사.
14. `scripts/seo-audit.ts` — 미측정 orphan 오보고 제거.
15. `docs/NAVER_COMPETITOR_REVIEW.md` — 앞선 경쟁 사이트 관찰과 한계.
16. `docs/SEO_PLATFORM_FOUNDATION.md` — 이 문서.
17. `docs/reports/regional-journey-audit.json` — DB 감사 결과.
18. `docs/reports/regional-journey-http.json` — 로컬 HTTP 결과.

## J. 다음 우선순위 5개

1. 이번 변경의 Preview 실환경 지도/광고/DB 회귀 검증 후 승인 배포.
2. Search Advisor의 수집·색인·노출 자료로 지역/의도별 실제 병목 확인; 현재 순위 상승을 선언하지 않기.
3. 같은 연도·동물·체중 조건의 지역 진료비 비교와 역사적 지역 표시 강화.
4. 근거 있는 운영정보 및 충분한 지역 고유 콘텐츠를 먼저 보강한 뒤 허브/breadcrumb/가이드 메타데이터 확장.
5. 개인정보 없는 탐색·비교 전환 측정과 전체 렌더 그래프 orphan 감사로 효과와 누락을 검증.

현재 판정: 기술적 연결 기반은 로컬 검증 완료. 검색엔진 발견·색인·순위 상승 및 수익 증가는 미확인이다.
