# 두들펫 (Dudle Pet)

기존 Next.js UI를 유지하면서 PostgreSQL/PostGIS 실데이터 경로를 준비하는 서비스입니다.

**현재는 실데이터 전환 완료가 아닙니다.** DB/API/Kakao 설정과 실제 응답 자료가 없어 실제 테이블 생성, 100건 적재, 여수 실데이터 및 지도 마커 검증은 미실행입니다. 구현·검증·남은 조건은 docs/BUILD_REPORT.md에 구분했습니다.

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

공식 파일을 검토해 scripts/import-fees.ts의 내부 JSON 계약으로 변환한 뒤 `pnpm import:fees file.json`을 실행합니다.
원본 파일 해시·출처·조사연도·분류·동물/체중 차원과 변경 이력을 보존합니다. 공식 파일을 아직 받지 않았으므로 실수치 import는 수행하지 않았습니다.
숫자가 없는 항목은 자료 없음이며 0원으로 바꾸지 않습니다.

## 관리자와 지도

/admin에서 DB 집계, 시설 목록, 검증 등록, 신고 처리, 동기화 로그, SEO 보류를 제공합니다.
관리자 세션과 신고 rate limit에는 32자 이상의 ADMIN_SESSION_SECRET 및 DB가 필요합니다.
공식 원본은 관리자 폼에서 덮어쓰지 않습니다. 변경은 감사 로그와 함께 저장됩니다.
Kakao SDK는 시설 화면에서만 지연 로드합니다. 실제 키·도메인에서 지도 선택과 마커를 별도 검증해야 합니다.

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

현재 Git remote가 없으며 push/deploy/DNS 변경은 하지 않았습니다.
main을 GitHub에 push한 뒤 Vercel에서 repository root를 Next.js로 import합니다.
환경변수, DNS, HTTPS, 키 교체, 운영 연락처/개인정보 방침 확인은 SETUP_CHECKLIST.md를 따릅니다.
광고는 ADSENSE_ENABLED=false로 유지하며 root domain ads.txt는 변경하지 않습니다.
