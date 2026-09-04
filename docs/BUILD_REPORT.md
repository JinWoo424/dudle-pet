# Phase 구현 보고

| Phase | 완료 | 대표 변경 | 검증 | 남은 외부 조건 |
|---|---|---|---|---|
| 0 | 저장소 검사·계획 | docs, env contract | 파일 확인 | Git remote 없음 |
| 1 | Next foundation·홈·정책 | `src/app`, 공통 layout | lint/type/build | 없음 |
| 2 | PostgreSQL/PostGIS schema·migration·mock | `src/db`, `drizzle` | typecheck, geo tests | Supabase URL |
| 3 | adapter·inspection·retry·sync shell | `src/data/adapters`, scripts | adapter tests | API key, 2 endpoint, samples |
| 4 | 병원·약국·장례 목록/상세 | catch-all routes, cards | browser flows | 실데이터 import |
| 5 | Kakao lazy map·nearby SQL·geolocation | map/nearby components | build, geo tests | Kakao key, PostGIS DB |
| 6 | 검색·filter·sort·empty | search route, filter bar | E2E | DB full-text tuning |
| 7 | tri-state·verified-only UX | feature model/routes | policy/E2E | 실제 검증 records |
| 8 | 진료비 schema·공개 비교 | cost routes | E2E | 공식 import file |
| 9 | admin auth/dashboard·신고 boundary | admin/API routes | typecheck/build | admin secrets, durable mutations |
| 10 | metadata·canonical·robots·sitemap·JSON-LD | metadata routes | build | 실데이터 SEO evaluation job |
| 11 | conditional Ads/GA | ads/analytics components | policy tests | slot ids, GA id |
| 12 | unit/integration/E2E·responsive CSS | Vitest/Playwright | acceptance suite | live DB/API integration |
| 13 | 운영 문서 | README/docs/checklists | link/file review | 배포자 확인 |
| 14 | 최종 검증 | 전체 repo | acceptance commands | GitHub/Vercel 권한 |

## 최종 검증 결과

- `lint`: 통과, warning 0
- `typecheck`: 통과
- `test`: 5 files, 19 tests 통과
- `build`: Next.js production build 통과, 26 static generation entries
- `test:e2e`: desktop Chromium 3개 + 375px mobile Chromium 3개, 총 6개 통과
- smoke: 홈, 여수 병원, health, sitemap index, region sitemap, robots 모두 HTTP 200

## 공개 전 남은 작업

코드 오류가 아니라 외부 값이 필요한 항목만 남아 있다: Supabase connection, 공공데이터 실제 sample과 약국/장례 endpoint, Kakao keys, admin/cron secrets, 공식 진료비 파일, GitHub remote 및 Vercel/DNS 설정. 이 항목들은 `SETUP_CHECKLIST.md`와 `LAUNCH_CHECKLIST.md`에서 추적한다.
