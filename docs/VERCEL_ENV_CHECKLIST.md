# Vercel Environment Variables

비밀값은 Vercel Dashboard의 encrypted Environment Variables에만 입력한다. GitHub Secrets, 소스, 문서, 빌드 명령 인자에 넣지 않는다. `SUPABASE_CA_CERT_PATH`는 로컬 전용이며 Vercel에는 사용하지 않는다.

| 변수 | 용도 | 분류 | Preview | Production | 가져오는 곳 |
|---|---|---|---:|---:|---|
| `NEXT_PUBLIC_SITE_URL` | canonical·sitemap 기준 URL | 공개 | 필수 | 필수 | 고정값 `https://pet.dudle.co.kr` |
| `DATA_MODE` | DB 실데이터 모드 | 공개 설정 | 필수 | 필수 | 고정값 `database` |
| `DATABASE_URL` | 서버 런타임 pooled DB 연결 | 비밀 | 필수 | 필수 | Supabase Session Pooler |
| `DIRECT_URL` | 수동 migration 전용 DB 연결 | 비밀 | 등록하되 Preview 자동 사용 금지 | 필수 | Supabase에서 확인한 migration 연결 |
| `SUPABASE_CA_CERT` | postgres.js TLS CA chain | 비밀 | 필수 | 필수 | 공식 CA PEM 전체를 multiline로 입력 |
| `PUBLIC_DATA_SERVICE_KEY` | 공식 시설 API 인증 | 비밀 | 등록하되 Preview Sync 금지 | 필수 | 공공데이터포털 발급 키 |
| `NEXT_PUBLIC_KAKAO_MAP_JS_KEY` | 브라우저 Kakao 지도 SDK | 공개 키·도메인 제한 필요 | 필수 | 필수 | Kakao Developers JavaScript 키 |
| `ADMIN_EMAIL` | 관리자 로그인 식별자 | 민감 설정 | 필수 | 필수 | 운영자가 결정 |
| `ADMIN_PASSWORD_HASH` | 관리자 비밀번호 scrypt hash | 비밀 | 필수 | 필수 | `npm run admin:hash-password` |
| `ADMIN_SESSION_SECRET` | 관리자 세션 HMAC | 비밀 | 필수 | 필수 | `npm run generate:secrets` |
| `CRON_SECRET` | Cron Bearer 인증 | 비밀 | 등록 가능, route는 항상 404 | 필수 | `npm run generate:secrets` |
| `ADSENSE_ENABLED` | 광고 실행 gate | 공개 설정 | 필수, `false` | 필수, 현재 `false` | 고정값 `false` |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | AdSense publisher 공개 ID | 공개 | 필수 설정 목록에 보존, 광고는 OFF | 필수 | 기존 publisher ID `ca-pub-7368372468718077` |
| `NEXT_PUBLIC_GA_ID` | 분석 태그 | 공개 | 선택, 현재 미설정 권장 | 선택 | Analytics 설정 |
| `GOOGLE_SITE_VERIFICATION` | Google 소유권 확인 | 공개 token | 불필요 | 선택 | Search Console 승인 단계 |
| `NAVER_SITE_VERIFICATION` | Naver 소유권 확인 | 공개 token | 불필요 | 선택 | Search Advisor 승인 단계 |

## 입력 후 확인

1. Preview scope와 Production scope를 혼동하지 않았는지 확인한다.
2. `SUPABASE_CA_CERT`의 BEGIN/END 줄과 줄바꿈이 보존됐는지 확인한다.
3. Preview Build Command에 migration, seed, Sync, fee import를 연결하지 않는다.
4. `npm run verify:vercel-env`는 실제 값을 출력하지 않고 SET/MISSING/INVALID만 보고한다.
5. Preview Cron은 환경변수 등록 여부와 무관하게 코드에서 404로 차단된다.
