# 실데이터 전환 시작 감사 (2026-09-05)

기준: 961f2a7, main, 변경 없음. 원격 저장소 없음.

| 영역 | 실제 상태 |
|---|---|
| 기술 | Next 16.3.3, React 19, TS strict, Tailwind 4, App Router, Drizzle 유지 |
| UI | 홈/시설/비용/가이드/정책, 로컬 생성 이미지. H1·간격 조정 대상 |
| Mock | src/data/mock.ts. DB 누락 시 production에서도 fallback하는 결함 |
| Repository | SQL 있으나 1000건 제한 후 JS 검색, 여수 URL/지역 고정 |
| DB | schema/수기 SQL 존재, migration journal 없음, 실제 연결 미검증 |
| 환경 | .env.local 없음. DB/API/Kakao/admin/cron 모두 미설정 |
| API | 병원 endpoint만 제공, response 미확인, parameter 추측, normalize throws |
| Sync | 콘솔 안내뿐, raw/upsert/change/presence 적용 없음 |
| Nearby | helper SQL 있음, 화면은 위치 확인 문구만 표시 |
| 지도 | lazy SDK·단순 marker, 선택/bounds 없음 |
| Admin | dashboard/login만, 운영 편집 없음 |
| 신고 | DB 없어도 저장 성공으로 안내 |
| SEO | mock 색인·sitemap 고정 URL, 실제 seo_pages 미사용 |
| JSON-LD | 병원/여수 URL 고정, 안전한 JSON escaping 누락 |
| 광고 | 기본 OFF, env로 활성화 가능 |
| 검증 | 19 unit/6 E2E; dev asset origin 차단으로 hydration 검증 불충분 |

이전 BUILD_REPORT의 “외부 값만 남음”은 정확하지 않았다. 이번 작업은 미구현 운영 코드를 보완하며, 구현과 실제 연결 검증을 구분한다. 실제 테이블 생성/API sample/import 건수는 증거 없이 완료로 기록하지 않는다.
