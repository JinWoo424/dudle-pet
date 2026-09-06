# 두들펫 (Dudle Pet)

기존 Next.js UI를 유지하면서 PostgreSQL/PostGIS 실데이터 경로를 준비하는 서비스입니다.

전국 동물병원·동물약국·동물장묘업은 공식 API 기반으로 적재되어 있습니다. 진료비는 공식 2025 machine-readable 파일이 아직 공개·공급되지 않아 실수치 Import 전 상태이며, 숫자를 추정하거나 공개 화면의 내부 JSON endpoint를 수집원으로 사용하지 않습니다.

## 실행

Node.js 22 이상, pnpm 10, PostgreSQL + PostGIS가 필요합니다.

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

기본 DATA_MODE는 database입니다. DB가 없으면 오류를 표시하며 가상 시설로 대체하지 않습니다.
UI 개발용 가상 데이터는 .env.local에서 명시적으로 DATA_MODE=mock을 선택할 때만 표시됩니다.
NODE_ENV=production 또는 VERCEL_ENV=production의 mock 모드는 시작/빌드 및 repository에서 차단합니다.
기존 USE_MOCK_DATA=true도 production에서 허용하지 않습니다.

## 실데이터 설정 순서

1. .env.local 또는 배포 환경에 DB 연결정보 입력. 값을 채팅·소스·스크린샷에 공유하지 마세요.
2. `pnpm db:migrate`, `pnpm db:health` 실행. migration은 checksum 및 transaction/advisory lock으로 관리합니다.
3. 공식 행정구역을 내부 JSON 형식으로 정리하고 `pnpm import:regions path/to/regions.json` 실행.
4. config/public-api/README.md에 따라 각 서비스의 **공식 operation/요청 규격** 확인.
5. 서비스 키 설정 후 `pnpm inspect:public-api`로 각 5건 검사.
6. 실제 응답 필드 및 샘플 SHA256을 계약에 기록. 추정 필드명 사용 금지.
7. `pnpm sync:hospitals`, `pnpm sync:pharmacies`, `pnpm sync:funerals`: 기본은 각각 100건입니다.
8. 실제 시설명·상태·주소·전화·지역·좌표·중복·상세 화면을 검수한 후 `pnpm sync:approve SNAPSHOT_ID --reviewed`.
9. 검수한 동일 계약에 한해서 `pnpm sync:hospitals --full` 등으로 전체 수집.
10. `pnpm seo:refresh`, 웹 캐시 재검증, 여수 acceptance 확인.

DB는 서버에서만 접근합니다. client-side Supabase/service-role 연결은 없습니다.
SQL migration이 extension/view/trigger/RLS를 포함한 실행 기준입니다. 자동 생성 migration을 검토 없이 적용하지 마세요.

## 진료비

공식 파일을 검토해 scripts/import-fees.ts의 내부 JSON 계약으로 변환한 뒤 `pnpm import:fees file.json --preview`로 먼저 검증하고, 모든 gate 통과 후 `pnpm import:fees file.json --commit`을 실행합니다.
원본 파일 해시·출처·조사연도·분류·동물/체중 차원과 변경 이력을 보존합니다. 공식 파일을 아직 받지 않았으므로 실수치 import는 수행하지 않았습니다.
숫자가 없는 항목은 자료 없음이며 0원으로 바꾸지 않습니다.
성공 batch는 `pnpm import:fees --rollback BATCH_UUID`로 비활성화할 수 있으며 통계 행과 감사 이력은 삭제하지 않습니다. 관리자 화면에서도 동일한 Preview·Import·rollback 흐름을 제공합니다.

## 관리자와 지도

/admin에서 DB 집계, 시설 목록, 검증 등록, 신고 처리, 동기화 로그, SEO 보류를 제공합니다.
관리자 세션과 신고 rate limit에는 32자 이상의 ADMIN_SESSION_SECRET 및 DB가 필요합니다.
공식 원본은 관리자 폼에서 덮어쓰지 않습니다. 변경은 감사 로그와 함께 저장됩니다.
Kakao SDK는 시설 화면에서만 지연 로드합니다. 실제 키·도메인에서 지도 선택과 마커를 별도 검증해야 합니다.

관리자 비밀번호와 세션/Cron 비밀값은 로컬 터미널에서 다음 명령으로 생성합니다. 평문 비밀번호는 입력 중 표시하거나 파일에 저장하지 않으며, 출력된 값은 Git이 아닌 Vercel encrypted environment variable에 직접 등록합니다.

```powershell
pnpm admin:hash-password
pnpm generate:secrets
pnpm verify:supabase-ca
pnpm verify:vercel-env
pnpm preflight:vercel
```

## 검증

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

E2E는 별도 .next-e2e 폴더와 3100번 포트에서 명시적 개발 Mock을 사용합니다.
375/390/768/1440px를 검사합니다. 이는 실제 DB E2E가 아닙니다.
별도 폐기 가능한 TEST_DATABASE_URL을 설정하면 PostGIS 통합 테스트가 임시 스키마를 만들고 제거합니다.
운영 DATABASE_URL과 같은 테스트 URL은 거부합니다.

## 배포

main을 GitHub에 push한 뒤 Vercel에서 repository root를 Next.js로 import합니다. Preview와 Production의 환경변수 scope는 분리하며 [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)를 기준으로 등록합니다.
Preview는 모든 응답에 noindex/nofollow 정책을 적용하고 robots.txt에서 전체 수집을 차단합니다. canonical과 sitemap URL은 항상 `https://pet.dudle.co.kr` 기준이며 Vercel Preview hostname은 sitemap에 기록하지 않습니다.
자동 Sync/Cron은 Preview에서 실행되지 않고 Production의 정식 hostname에서만 허용됩니다. Preview DB 변경은 인증된 관리자 수동 작업 외에는 수행하지 않습니다.
환경변수, DNS, HTTPS, 키 교체, 운영 연락처/개인정보 방침 확인은 SETUP_CHECKLIST.md를 따릅니다.
Vercel 입력표는 [docs/VERCEL_ENV_CHECKLIST.md](./docs/VERCEL_ENV_CHECKLIST.md), Dashboard 절차는 [docs/VERCEL_DEPLOY.md](./docs/VERCEL_DEPLOY.md), 배포 후 자동 검사는 `VERCEL_PREVIEW_URL=https://... npm run qa:preview`를 사용합니다.
광고는 ADSENSE_ENABLED=false로 유지하며 root domain ads.txt는 변경하지 않습니다.
