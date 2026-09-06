# Vercel Preview 배포

이 단계는 `*.vercel.app` Preview 검증까지만 다룬다. custom domain, DNS, 검색엔진 등록, Production Cron, 광고 활성화는 하지 않는다.

1. `npm run prepare:vercel-preview-env`를 실행해 Git에서 제외된 `.local-secrets/vercel-preview.env`를 준비한다. 기존 연결정보·공식 CA를 안전하게 복사하고 세션/Cron 비밀을 생성하며 실제 값은 출력하지 않는다.
2. `ADMIN_EMAIL`을 해당 로컬 파일에 직접 입력한다.
3. 로컬 TTY에서 `npm run admin:hash-password -- --save-preview-env`를 실행한다. 평문을 표시·저장하지 않고 hash만 로컬 파일에 기록한다.
4. `npm run verify:supabase-ca`와 `npm run verify:vercel-env -- --file=.local-secrets/vercel-preview.env`를 실행한다.
5. Vercel Dashboard에 로그인하고 **Add New → Project**를 선택한다.
6. GitHub 저장소 `JinWoo424/dudle-pet`에서 **Import**를 선택한다.
7. Framework Preset이 **Next.js**, Root Directory가 `./`인지 확인한다.
8. Install, Build, Output 설정은 Vercel이 감지한 기본값을 유지한다. migration, seed, Sync, fee import 명령을 추가하지 않는다.
9. Project Settings → Environment Variables에서 로컬 파일의 항목을 Preview scope에 입력한다. `SUPABASE_CA_CERT_PATH`는 입력하지 않는다.
10. **Deploy** 후 생성된 URL을 `VERCEL_PREVIEW_URL`에만 설정하고 `npm run qa:preview` 및 브라우저 QA를 수행한다.

## 이번 단계에서 변경하지 않는 항목

- `pet.dudle.co.kr` custom domain과 DNS
- Google Search Console과 Naver Search Advisor
- Production Cron
- `ADSENSE_ENABLED=true`와 Auto Ads
