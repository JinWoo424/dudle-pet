# 두들펫 설정·출시 체크리스트

## 비밀값과 키 교체

- [ ] 노출 이력이 있는 Kakao REST API Key를 production 전에 새 키로 교체.
- [ ] 공공데이터 Service Key도 가능하면 재발급 후 production 사용.
- [ ] 새 비밀값은 Shell/로컬 .env.local/Vercel 환경변수에만 저장. 채팅·스크린샷·Git 금지.
- [ ] Kakao JavaScript Key는 등록 도메인 제한: http://localhost:3000, https://pet.dudle.co.kr.
- [ ] .env 및 모든 .env.*는 Git 제외(.env.example만 예외).

## Vercel Preview 환경변수

Vercel Project Settings → Environment Variables에서 아래 값을 **Preview scope에만** 등록한다. 값은 Git, 문서, 배포 로그에 복사하지 않는다.

- [ ] NEXT_PUBLIC_SITE_URL=https://pet.dudle.co.kr (canonical 고정)
- [ ] DATA_MODE=database
- [ ] DATABASE_URL (Preview에서 읽기 위주로 사용할 pooled connection)
- [ ] DIRECT_URL (등록만 하고 Preview build/deploy에서 migration 실행 금지)
- [ ] `SUPABASE_CA_CERT` (encrypted multiline PEM; `SUPABASE_CA_CERT_PATH` 사용 금지)
- [ ] PUBLIC_DATA_SERVICE_KEY (등록 가능, Preview 자동 Sync 금지)
- [ ] NEXT_PUBLIC_KAKAO_MAP_JS_KEY
- [ ] ADMIN_EMAIL, ADMIN_PASSWORD_HASH, ADMIN_SESSION_SECRET
- [ ] CRON_SECRET (등록 여부와 관계없이 Preview Cron route는 404)
- [ ] ADSENSE_ENABLED=false
- [ ] NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-7368372468718077 (공개 ID만 보존, 광고 활성화 아님)
- [ ] GOOGLE_SITE_VERIFICATION, NAVER_SITE_VERIFICATION, NEXT_PUBLIC_GA_ID, TEST_DATABASE_URL은 Preview에 등록하지 않음.
- [ ] Preview build/deploy에서 migration, 전국 Sync, 진료비 import, merge/rollback 명령을 실행하지 않음.
- [ ] Preview hostname의 `X-Robots-Tag: noindex, nofollow`, HTML robots meta, `/robots.txt` 전체 차단 확인.
- [ ] `/sitemap.xml`과 canonical에 Preview hostname이 없고 `https://pet.dudle.co.kr`만 사용되는지 확인.

## Vercel Production 환경변수

다음 값은 **Production scope**에 등록한다. Preview와 동일한 비밀을 재사용해야 하는지 운영자가 별도로 판단한다.

- [ ] NEXT_PUBLIC_SITE_URL=https://pet.dudle.co.kr
- [ ] DATA_MODE=database
- [ ] DATABASE_URL (서버용 pooled), DIRECT_URL (migration용)
- [ ] `SUPABASE_CA_CERT`: Vercel encrypted environment variable에 공식 CA PEM 전체를 multiline 값으로 저장. 로컬 `SUPABASE_CA_CERT_PATH`와 같은 Windows 절대경로는 production에 설정하지 않음.
- [ ] PUBLIC_DATA_SERVICE_KEY
- [ ] NEXT_PUBLIC_KAKAO_MAP_JS_KEY, KAKAO_REST_API_KEY
- [ ] ADMIN_EMAIL, ADMIN_PASSWORD_HASH (scrypt), ADMIN_SESSION_SECRET (32자 이상)
- [ ] CRON_SECRET (32자 이상)
- [ ] GOOGLE_SITE_VERIFICATION, NAVER_SITE_VERIFICATION
- [ ] NEXT_PUBLIC_GA_ID (선택)
- [ ] ADSENSE_ENABLED=false
- [ ] NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-7368372468718077 (공개 ID, 활성화 뜻 아님)
- [ ] TEST_DATABASE_URL은 폐기 가능한 별도 테스트 환경에만 설정.

관리자 자격 증명은 `pnpm admin:hash-password`, 세션/Cron 비밀은 `pnpm generate:secrets`로 로컬에서 생성한다. 명령 출력은 Vercel encrypted environment variable에 직접 옮기고 저장소 파일에 쓰지 않는다.
상세 scope·용도·취득 위치는 [docs/VERCEL_ENV_CHECKLIST.md](./docs/VERCEL_ENV_CHECKLIST.md)를 따른다.

## 실제 acceptance

- [ ] 자동 보안 검토가 migration 실행을 차단했으므로 실제 DB 대상을 확인하고 스키마 변경 실행 승인.

- [ ] db:migrate 성공 / 적용 migration checksum 확인.
- [ ] db:health에서 DB/PostGIS/거리 query 확인.
- [ ] RLS와 anon/authenticated 접근 차단, 서버 역할의 실제 권한 확인.
- [ ] 공식 행정구역 registry와 3종 API 계약 확정.
- [ ] 각 5건 sample → 필드 확인 → 100건 import → 수동 검수 승인.
- [ ] 여수 실제 이름·주소·전화·상태·좌표·상세 페이지 확인.
- [ ] 약국/장례 실제 시설, 진료비 공식 출처 확인.
- [ ] 2025 진료비 공식 machine-readable 파일을 확보한 경우에만 관리자 Preview → Import. 현재 공개 화면의 문서화되지 않은 JSON endpoint를 production 수집원으로 사용하지 않음.
- [ ] 진료비 Preview에서 20개 항목, historical region, 모든 가격 범위, duplicate key가 통과했는지 확인.
- [ ] 실제 Kakao SDK markers/selection 및 전화·길찾기 확인.
- [ ] production Mock/가상가격/개발 배너가 없음.
- [ ] 관리자 로그인/검증 저장/만료/신고 처리/감사 이력 실검증.
- [ ] seo:refresh / sitemap 실제 canonical·lastmod 확인.
- [ ] 전국 작업 시간·쿼터 측정 후 cron 실행 방식 검증. 40초 예산 초과 시 재개 분할 구현 필요.
- [ ] 운영자 문의 채널과 개인정보 처리 세부사항 확정.
- [ ] 백업과 별도 환경 복원 연습.

## GitHub / Vercel / 도메인

- [ ] 실제 GitHub dudle-pet remote 연결 및 main push.
- [ ] Vercel Add New → Project → `JinWoo424/dudle-pet` import: Framework Next.js, Root Directory repository root. Install/Build/Output 설정은 감지된 Next.js 기본값을 유지하고 임의 override하지 않음.
- [ ] 첫 배포는 Preview로 확인하며 Production Deploy/Promote는 아직 실행하지 않음.
- [ ] 배포 성공 후 pet.dudle.co.kr 추가.
- [ ] Vercel이 실제 표시한 CNAME/A만 적용. DNS 추정 금지.
- [ ] HTTPS 발급 및 HTTP→HTTPS 확인.
- [ ] Google/Naver 소유권 확인과 수집 상태 확인.
- [ ] 375/390/768/1440px production QA.
- [ ] 광고 script 없음, Auto Ads OFF 유지.
- [ ] root dudle.co.kr ads.txt의 기존 publisher ID 확인(이번 작업에서 변경하지 않음).

## Production TLS와 Runtime

- [ ] Supabase 공식 CA PEM은 Vercel encrypted `SUPABASE_CA_CERT`로 저장하고 줄바꿈이 보존되는지 Preview/Production에서 확인.
- [ ] `rejectUnauthorized=true` 유지. `NODE_TLS_REJECT_UNAUTHORIZED=0`, `rejectUnauthorized=false`, SSL 비활성화 금지.
- [ ] DB·Admin·Cron·동적 sitemap route가 Node.js runtime인지 배포 결과에서 확인.
- [ ] Preview deployment에서 DB health, PostGIS, 관리자 로그인, cron 404 차단을 점검한 후 별도 승인으로 Production 승격.
