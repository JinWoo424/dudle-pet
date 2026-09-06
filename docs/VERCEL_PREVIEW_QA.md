# Vercel Preview QA

Preview 배포 URL은 공개 검색 색인 대상이 아니며 Production 승격 승인도 아니다. 모든 비밀값은 Vercel encrypted environment variable로만 다룬다.

## 배포 전

- GitHub `main`의 대상 commit SHA와 Vercel 배포 commit SHA가 일치한다.
- Framework Preset은 Next.js, Root Directory는 저장소 root, Node.js는 22 이상이다.
- Preview scope 환경변수는 `SETUP_CHECKLIST.md`의 Preview 목록과 일치한다.
- `SUPABASE_CA_CERT` multiline PEM이 Preview scope에 있으며 `SUPABASE_CA_CERT_PATH`는 없다.
- Install/Build/Output은 Vercel이 감지한 Next.js 기본 설정을 유지한다. migration, seed, Sync, 진료비 import 명령을 연결하지 않는다.
- Vercel Cron을 Preview에 생성하지 않는다.

## URL과 데이터

- `/`를 확인한다.
- 병원: `/hospital/seoul`, `/hospital/busan`, `/hospital/jeonnam/yeosu`를 확인한다.
- 약국: `/pharmacy/seoul`, `/pharmacy/busan`, `/pharmacy/jeonnam/yeosu`를 확인한다.
- 장례: `/funeral/gyeonggi`, `/funeral/busan`을 확인한다.
- 병원 상세 3건과 약국 상세 3건을 실제 목록 링크에서 열고, 병원 상세의 주변 약국 연결을 확인한다.
- `/cost`, `/admin`, `/robots.txt`, `/sitemap.xml`, `/api/health`를 확인한다.
- 실제 DB 기반 시설 수·이름·주소·전화·공식 상태·기준일이 표시되고 가상 데이터 배너가 없다.
- `/cost`는 공식 진료비가 비어 있는 동안 빈 상태이며 noindex다. 추정 가격이나 0원 행이 없다.
- 지도는 실제 좌표가 있는 시설만 marker로 표시한다. marker 클릭과 시설 카드 선택이 양방향 연동되고, 좌표 없는 시설도 목록에는 남는다.
- 지도 SDK 오류가 목록과 상세 링크를 깨지 않는다.

## 보안과 검색

- 대표 HTML 응답에 `X-Robots-Tag: noindex, nofollow`가 있다.
- HTML `<meta name="robots">`가 noindex/nofollow다.
- `/robots.txt`는 모든 user agent에 `/`를 disallow하고 sitemap을 광고하지 않는다.
- canonical은 `https://pet.dudle.co.kr`이며 Preview hostname이 `/sitemap.xml` 또는 sitemap child 문서에 없다.
- `/api/cron/daily-maintenance`는 Preview에서 secret 유무와 관계없이 404다.
- 관리자 mutation은 로그인 전 거부되고 로그인 후 의도한 수동 작업만 가능하다.
- `rejectUnauthorized: true`가 유지되고 DB/Admin/Cron/sitemap route는 Node.js runtime이다.
- 광고 스크립트와 Auto Ads가 없다.

## 화면과 품질

- 375px, 390px, 768px, 1440px에서 가로 overflow, 겹침, 잘린 버튼을 확인한다.
- 브라우저 console error, failed request, hydration error가 없다.
- Server 500, DB TLS 오류, Kakao SDK 오류, 깨진 이미지와 내부 링크가 없다.
- canonical, robots, structured data, sitemap의 URL과 색인 정책이 일관된다.
- 첫 화면, 지역 목록, 상세 화면의 loading/error/empty 상태를 확인한다.
- 대표 페이지의 응답 시간을 기록한다. Lighthouse 또는 Vercel Speed Insights로 LCP, CLS, INP 회귀를 기록하되 이번 단계에서 분석/광고를 활성화하지 않는다.

## 중지 조건

- Preview가 indexable하거나 Preview hostname이 canonical/sitemap에 포함됨.
- TLS 인증서 검증 오류 또는 SSL 우회 설정 발견.
- 자동 migration/Sync/Cron이 실행됨.
- 인증되지 않은 Admin mutation이 성공함.
- 가상 시설/추정 진료비/광고가 노출됨.

하나라도 해당하면 Production Deploy/Promote를 중지하고 Preview 설정 또는 코드를 수정한다.
