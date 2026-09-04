# 두들펫 작업 현황

상태: `[ ]` 대기 · `[~]` 진행 · `[x]` 완료 · `[!]` 외부 설정 필요

## Phase 0 — 계획

- [x] 빈 저장소, Git 상태, 로컬 런타임 확인
- [x] `MASTER_PLAN.md`, `TASKS.md`, `DATA_MODEL.md`
- [x] `.env.example`, `.gitignore`

## Phase 1 — Foundation

- [x] Next.js App Router + TypeScript + Tailwind
- [x] 브랜드 토큰, 공통 layout/navigation/footer
- [x] 홈, about/contact/privacy/terms/data-policy
- [x] 첫 lint/typecheck/test/build gate

## Phase 2 — Database

- [x] Drizzle schema와 PostgreSQL enum/table/index
- [x] PostGIS extension, geography point, GIST migration
- [x] 여수 mock seed(병원 8, 약국 5, 장례 2)

## Phase 3 — Data ingestion

- [x] adapter interface 및 3개 MOIS adapter shell
- [x] raw → normalize → validate → anomaly gate boundary
- [x] inspect/sync scripts와 retry 정책
- [!] 실제 sample mapping: `PUBLIC_DATA_SERVICE_KEY`와 약국/장례 endpoint 확인 필요

## Phase 4–8 — Public product

- [x] 지역/병원/약국/장례 목록·상세
- [x] 24h/night/exotic verified-only pages
- [x] Kakao lazy map, geolocation fallback, PostGIS nearby query
- [x] 검색/filter/sort/empty state
- [~] 진료비 schema/지역 비교 pages 완료, admin import UI는 실파일 확정 후

## Phase 9 — Admin

- [x] secure login/session/rate limit
- [~] dashboard·신고 boundary 완료, 시설·검증·sync mutation UI는 DB 연결 후
- [x] audit log and verification expiry schema/policy

## Phase 10–11 — Discovery & revenue

- [x] SEO eligibility/quality/canonical policy
- [x] sitemap, structured data, internal links
- [x] conditional AdSense + named slots + monetization policy
- [x] GA event adapter

## Phase 12–14 — Release

- [x] Vitest acceptance coverage
- [x] Playwright public scenarios
- [x] 375/768/1440 responsive CSS, mobile E2E project
- [x] README and all operations documents
- [x] final lint/typecheck/test/build
- [!] GitHub remote 연결, main push, Vercel project/import, DNS/verification
