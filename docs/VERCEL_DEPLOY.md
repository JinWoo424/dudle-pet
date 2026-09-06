# Vercel Preview 배포

이 단계는 `*.vercel.app` Preview 검증까지만 다룬다. custom domain, DNS, 검색엔진 등록, Production Cron, 광고 활성화는 하지 않는다.

1. 로컬 터미널에서 `npm run admin:hash-password`를 실행하고 평문을 화면에 표시하지 않은 채 hash를 준비한다.
2. `npm run generate:secrets`로 서로 독립적인 세션/Cron 비밀을 준비한다. 출력은 파일에 저장하지 않는다.
3. `npm run verify:supabase-ca`로 로컬 공식 CA 파일의 존재·PEM·X.509·유효기간을 확인한다.
4. Vercel Dashboard에 로그인한다.
5. **Add New → Project**를 선택한다.
6. GitHub 저장소 `JinWoo424/dudle-pet`에서 **Import**를 선택한다.
7. Framework Preset이 **Next.js**, Root Directory가 `./`인지 확인한다.
8. Install, Build, Output 설정은 Vercel이 감지한 기본값을 유지한다. migration, seed, Sync, fee import 명령을 추가하지 않는다.
9. Project Settings → Environment Variables에서 [VERCEL_ENV_CHECKLIST.md](./VERCEL_ENV_CHECKLIST.md)의 Preview 항목을 입력한다. 비밀값은 Preview scope에만 encrypted 값으로 입력한다.
10. `SUPABASE_CA_CERT`에는 공식 CA PEM 전체를 multiline로 입력한다. 로컬 경로 변수는 입력하지 않는다.
11. **Deploy**를 누르고 배포 commit이 준비한 GitHub `main` SHA와 같은지 확인한다.
12. 생성된 `*.vercel.app` URL을 shell의 `VERCEL_PREVIEW_URL`에만 설정하고 `npm run qa:preview`를 실행한다.
13. [VERCEL_PREVIEW_QA.md](./VERCEL_PREVIEW_QA.md)의 브라우저·반응형·Kakao marker 항목을 수행한다.
14. 실패가 하나라도 있으면 Production 승격을 중지한다.

## 이번 단계에서 변경하지 않는 항목

- `pet.dudle.co.kr` custom domain과 DNS
- Google Search Console과 Naver Search Advisor
- Production Cron
- `ADSENSE_ENABLED=true`와 Auto Ads
