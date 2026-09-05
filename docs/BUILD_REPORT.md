# 실데이터 전환 구현·검증 보고 — 2026-09-05

**실데이터 1차 전환 미완료.** 기존 UI는 유지했고, 아래의 코드 기반과 로컬 검증을 진행했습니다.
이 문서는 이전 보고서의 “외부 값만 남았고 모두 완료”라는 부정확한 표현을 대체합니다.

| 항목 | 확인 결과 |
|---|---|
| A DB 연결 | 이 작업 환경에 DB 연결정보 없음. db:health 실행은 실패 상태를 반환. 연결 성공 주장 없음 |
| B 실제 생성 테이블 | 이 작업에서 실제 생성 여부 확인 못 함. 초기 SQL + 0001 운영 migration 작성. migration 실행은 DB 변경 위험으로 자동 보안 검토에서 차단되어 미실행 |
| C PostGIS | 사용자 제공 상태는 활성화. 이 작업의 실제 DB 조회/ST_Transform/ST_DWithin은 미검증 |
| D API endpoint | 병원은 사용자 제공 base URL만 확인. 실제 operation 및 약국/장묘 operation 미확정 |
| E 실제 JSON mapping | 미확정. 공식 계약 기반 adapter 구현, 임의 JSON key 사용하지 않음 |
| F API sample | 키 없음으로 inspect 명령 비정상 종료(의도한 차단). 실제 샘플 파일 생성/수집 없음 |
| G 100건 import | 합성 100건 정규화 단위 테스트 통과. 실제 100건 DB 적재 미실행 |
| H 여수 실제 화면 | 같은 SQL repository/지역/직접 ID 경로 구현. 실제 시설 표시 미검증; E2E는 명시적 개발 Mock |
| I Kakao Map | lazy SDK, 마커, bounds, 선택 카드·지도 이동 구현. 실제 키/마커/도메인 QA 미실행 |
| J Mock | 개발 fixture 유지. production build/runtime 차단, DB 오류 fallback 제거. E2E만 Mock 사용 |
| K 진료비 | 지역·항목·동물/체중/연도 구분 및 공식 JSON import CLI. 공식 파일 미수령/미적재. Production 가상 수치 차단 |
| L Admin | 실제 SQL 집계·검증 저장·신고 처리·SEO hold·감사 로그·DB rate limit 코드. 실제 계정/DB 저장 QA 미실행 |
| M SEO | 실제 URL/지역 metadata, 안전한 JSON-LD, seo_pages SEO_READY 전용 분할 sitemap, manual hold. 실제 재계산 미실행 |
| N 광고 OFF | ADSENSE_ENABLED=false 유지. 빌드된 HTML에서 adsbygoogle.js 없음. 4개 너비 E2E에서도 광고 script 없음. ads.txt/DNS/광고계정 변경 없음 |
| O 테스트 | unit 38 통과, DB 통합 1개 skip(TEST_DATABASE_URL 없음), Mock E2E 20 통과(375/390/768/1440px), lint/typecheck 통과 |
| P Build | Next 16.3.3 production build 통과. DATA_MODE=mock production build는 의도대로 실패 |
| Q Git | main 코드 커밋 6bd4a46. 검증/문서 별도 커밋. Git remote 없음, push 없음 |
| R 사용자 남은 작업 | DB 대상/스키마 변경 승인, 환경변수·공식 API 문서·샘플·공식 지역/비용 자료·Kakao QA·운영정책, GitHub/Vercel/DNS/SSL |

## 실제 실행 증거

- TypeScript/ESLint: 오류 없이 종료.
- Vitest: 8 test files passed, 1 integration file skipped; 38 passed, 1 skipped.
- Playwright: 20 passed. 실제 브라우저 hydration 후 검색→지역→상세 흐름, 유효한 404, 거리 API 입력 검증.
- 375px/1440px Home 및 상세 화면 캡처 육안 확인. 모바일 CTA 첫 viewport와 가로 overflow 검사.
- 개발 SDK 키가 없어 실제 지도 이미지는 ‘지도 연결 대기 중’이며, 이를 실제 지도 검증으로 계산하지 않음.
- 사용자 3000번 서버를 종료하지 않았음. E2E는 3100번 및 별도 build directory 사용.
- DB/API 검사 명령: 설정 부족 시 exit 1. 성공 메시지로 대체하지 않음.
- migration 명령: 자동 보안 검토가 실행 전에 거부. 우회 실행하지 않음.
- 현재 작업 파일의 기본 secret scan: findings 없음. 과거 Git history 전체의 비밀값 부재를 보장하는 검사는 아님.
- Drizzle config의 하드코딩된 DB 접속 fallback 제거. 테스트 fixture의 값은 명시적 합성 값.

## 남아 있는 구현/운영 한계

1. 전국 수집은 실제 건수/속도/쿼터 검증 전. cron의 40초 수집 예산을 넘는 경우를 위한 재개형 분할 미구현.
2. 새 API가 계약 스키마와 다른 envelope/날짜/좌표계를 사용하면 근거에 맞춘 adapter 확장 필요.
3. 실제 주소 변형·전국 행정구역·지역 경계 좌표 검증이 필요.
4. 진료비 업로드/preview·batch rollback UI 없음. 현재 검증형 CLI만 구현.
5. 지역 registry는 캐시, 시설/검증은 요청 시 조회 중심. 운영 규모에서 SQL 부하와 캐시 정책 검증 필요.
6. 정책 페이지의 운영자 정보·문의 채널·보유기간 확정 필요. 개인정보/법무 검토 완료로 주장하지 않음.
7. GA 자동 수집 설정 및 이벤트 PII QA 필요. 정확한 위치/검색어/전화/신고 본문을 직접 이벤트 파라미터로 전송하지 않도록 구현.
8. 실제 Supabase에서 RLS/서버 권한/모든 migration SQL/관리자 저장/복원 테스트 필요.

다음 단계는 실제 대상 DB를 설정하고 스키마 변경을 승인받는 것입니다. 비밀값을 채팅에 보내지 마세요.
