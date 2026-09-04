# 두들펫 마스터 플랜

## 제품 목표

두들펫은 대한민국 사용자가 공식 등록 동물병원·동물약국·동물장묘업체와 지역 진료비 통계를 검색하고, 검증된 24시간·야간·특수동물 진료 정보 및 거리 정보를 확인하는 데이터 서비스다. 검색 페이지 수보다 출처, 기준일, 검증 근거, 실제 결과 수를 우선한다.

## 현재 저장소 기준선

- 2026-09-05 기준 Git 저장소만 생성된 빈 프로젝트이며 커밋과 원격 저장소가 없다.
- 기존 애플리케이션·환경변수·마이그레이션이 없어 보존할 기능은 없다.
- 로컬 기본 PATH에는 npm이 없고 Codex 번들 Node/pnpm을 사용한다.
- 외부 Secret 없이 개발·테스트·빌드할 수 있도록 mock adapter를 기본으로 둔다.

## 아키텍처

```text
공공데이터 API / 공식 CSV
  → 원본 JSON 보존
  → source adapter
  → normalize + validate + 좌표 변환
  → anomaly gate
  → PostgreSQL + PostGIS
  → repository/service 계층
  → Next.js App Router(RSC 우선)
  → 검색·지역·상세·지도·관리자·SEO
```

- Web: Next.js 16.3.3, React Server Components, TypeScript, Tailwind CSS 4.3
- Data: PostgreSQL/Supabase Seoul, Drizzle ORM, PostGIS raw SQL
- Client island: Kakao 지도와 브라우저 위치 권한만 Client Component
- Validation: Zod 기반 경계 검증
- Tests: Vitest unit/integration, Playwright E2E
- Runtime: Vercel. Cron은 `daily-maintenance` 단일 엔드포인트에서 source별로 독립 처리한다.

## 핵심 경계

1. 외부 응답을 페이지에서 직접 사용하지 않는다.
2. 공공 등록 상태와 두들펫 검증 정보를 다른 테이블·UI 섹션으로 유지한다.
3. `OPEN`은 “현재 영업 중”이 아닌 “공식 등록상 영업”으로 표시한다.
4. 확인하지 않은 24시간·야간·서비스 정보는 `NO`가 아니라 `UNKNOWN`이다.
5. 진료비는 개별 병원 가격이 아닌 지역 통계로만 표시한다.
6. 시설이 source에서 누락돼도 즉시 폐업시키지 않으며 연속 누락과 anomaly gate를 통과해야 한다.
7. mock 데이터는 production에서 활성화할 수 없다.

## 단계와 품질 게이트

| Phase | 범위 | 통과 조건 |
|---|---|---|
| 0 | 저장소 검사, 계획, 데이터 모델 | 필수 문서와 환경변수 계약 존재 |
| 1 | Next.js, 브랜드, 홈, 정책 페이지 | lint, typecheck, unit, build |
| 2 | Drizzle schema, PostGIS migration, seed | schema 검증, migration 정적 검사 |
| 3 | API adapter, raw/normalize/validate, mock sync | adapter integration test |
| 4 | 지역/시설 목록·상세 | 대표 route render test |
| 5 | Kakao map, geolocation, nearby SQL | 좌표·거리 unit test |
| 6 | 검색, autocomplete, filter/sort | search intent/filter tests |
| 7 | feature/hour/verification | unknown·만료 정책 tests |
| 8 | 진료비 schema/import/public pages | import validation tests |
| 9 | admin/auth/report/sync | auth boundary and mutation tests |
| 10 | SEO/canonical/sitemap/structured data | eligibility and metadata tests |
| 11 | ads/analytics/policies | monetization rules tests |
| 12 | E2E, 접근성, 성능, 보안 | acceptance scripts |
| 13 | 운영 문서 | setup/launch checklist complete |
| 14 | final verification | lint, typecheck, test, build 성공 |

## 배포 원칙

코드는 Vercel 배포를 기준으로 한다. DNS 값, 외부 endpoint와 response field는 실제 제공값이나 sample을 확인하기 전 추측하지 않는다. 이 저장소에는 Secret을 넣지 않는다. Git remote가 연결된 후 main 브랜치 push 및 Vercel import를 진행한다.

