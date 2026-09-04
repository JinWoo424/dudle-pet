# 두들펫 (Dudle Pet)

대한민국의 공식 등록 동물병원·동물약국·반려동물 장례시설과 지역 진료비 통계를 찾는 Next.js 서비스입니다. 공공 등록정보와 두들펫 확인정보를 분리하고, 24시간·야간 같은 정보는 검증 근거가 있을 때만 표시합니다.

## 요구사항

- Node.js 20.9 이상
- pnpm 10 이상
- PostgreSQL + PostGIS(Supabase Seoul 권장)

## 설치와 실행

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Secret이 없어도 로컬에서는 여수의 가상 병원 8개, 약국 5개, 장례시설 2개와 가상 진료비로 실행됩니다. 실존 시설에 가짜 기능을 연결하지 않습니다.

## 환경변수

전체 계약은 `.env.example`을 참고합니다. 브라우저에 노출 가능한 값은 `NEXT_PUBLIC_` 접두사가 있는 site URL, Kakao JS key, GA id, AdSense publisher id뿐입니다. Database URL, 공공데이터 key, Kakao REST key, admin/cron secret은 서버에서만 사용합니다.

Production 배포 전 반드시 `USE_MOCK_DATA=false`로 설정합니다. Vercel production에서는 mock repository가 자동으로 비활성화됩니다.

## Database와 PostGIS

`src/db/schema.ts`가 typed schema이고 `drizzle/0000_initial.sql`이 실행 가능한 초기 migration입니다. Supabase SQL editor 또는 direct connection에서 migration을 적용합니다. `facilities.location`은 `geography(Point,4326)`이며 GIST index를 사용합니다.

```bash
pnpm db:generate
pnpm db:migrate
pnpm seed
```

현재 환경에서 `drizzle-kit generate`가 OS passwd 메모리 오류를 내면 committed migration을 사용하고 Node LTS 환경에서 다시 schema diff를 검증합니다.

## 공공데이터 API

병원 endpoint만 확인값을 기본 제공하며 약국·장례 endpoint는 추측하지 않습니다. Key와 실제 endpoint를 설정한 뒤 아래 명령으로 sample과 key를 먼저 확인합니다.

```bash
pnpm inspect:public-api
pnpm sync:hospitals
pnpm sync:pharmacies
pnpm sync:funerals
pnpm sync:all
```

Sample mapping이 확정되기 전 production write sync는 의도적으로 잠겨 있습니다. 자세한 내용은 `docs/DATA_SOURCES.md`를 참고합니다.

## Kakao Map

`NEXT_PUBLIC_KAKAO_MAP_JS_KEY`를 설정하면 필요한 route에서만 SDK를 lazy load합니다. 지도 load가 실패해도 시설 목록과 전화·상세 링크는 동작합니다. 노출 이력이 있는 REST key는 실제 서버 기능 전에 교체해야 합니다.

## 관리자

`/admin`은 환경변수가 없으면 setup 안내만 표시합니다. 설정 후 HMAC session과 scrypt password hash로 로그인합니다. 운영 및 검증 규칙은 `docs/ADMIN.md`에 있습니다.

## 테스트

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

E2E는 Home→검색→상세→주변 약국, 24시간 verified-only, X-ray 통계→병원 흐름을 desktop/mobile Chromium에서 확인합니다.

## Vercel 배포

1. GitHub repository `dudle-pet`에 main branch를 push합니다.
2. Vercel에서 repository를 import하고 framework preset을 Next.js로 확인합니다.
3. `.env.example`의 production 값을 입력하되 mock은 false로 둡니다.
4. Vercel이 실제로 제시한 DNS 값을 `pet.dudle.co.kr`에 설정합니다.
5. `/api/health`, sitemap, cron과 주요 page를 확인합니다.

DNS 값은 추측하지 않습니다. 출시 전 `SETUP_CHECKLIST.md`와 `LAUNCH_CHECKLIST.md`를 모두 완료합니다.

## AdSense와 검색엔진

광고는 기본 OFF이며 page quality와 monetization 상태를 통과하고 slot id가 설정돼야 렌더링됩니다. Google Search Console은 domain property와 URL prefix property를 함께, Naver Search Advisor는 subdomain으로 등록하는 구성을 권장합니다.

## 문제 해결

- 지도가 비어 있음: Kakao JS key와 localhost/production 허용 domain 확인
- 목록이 가상 데이터임: DB/API adapter mapping 이전의 정상 개발 상태
- 빈 production 목록: mock 노출 방지를 위한 fail-closed 동작이므로 DB와 import 상태 확인
- sync가 잠김: `inspect:public-api` sample로 실제 response mapping을 먼저 확정
- admin 로그인 불가: hash 형식, email과 session secret 확인

