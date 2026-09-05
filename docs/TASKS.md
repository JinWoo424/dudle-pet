# 실데이터 전환 체크포인트 — 2026-09-05

[x]는 해당 코드/검증만 완료한 의미입니다. live acceptance와 구분합니다.

| Checkpoint | 코드 진행 | 실제 검증 |
|---|---|---|
| 1 Audit | [x] CURRENT_STATE 기록, 기존 과장된 완료 보고 정정 | [x] repository 검사 |
| 2 DB | [x] migration runner/운영 migration/PostGIS trigger/RLS/health | [!] DATABASE_URL/DIRECT_URL 없음; 생성 테이블 0건으로 주장하지 않음, 상태 미확인 |
| 3 API inspect | [x] 공식 계약 기반 fetch/parse, 5건 검사, credential redaction | [!] 키·operation/요청규격·response 계약 없음 |
| 4 100 import | [x] RAW/normalize/upsert/change/anomaly/approval 경로 | [x] 합성 100건 normalize; [!] 실제 DB 적재 미실행 |
| 5 Hospital | [x] 지역/검색/직접 ID/상태/출처/거리 SQL | [x] Mock E2E; [!] 여수 live QA |
| 6 Pharmacy/Funeral | [x] 같은 실제 DB 레이어/지역 URL | [x] Mock E2E; [!] 실제 시설 QA |
| 7 Kakao | [x] lazy SDK/markers/bounds/card selection/nearby POST | [!] 실제 key/marker/domain QA |
| 8 Admin | [x] 집계/검증/신고/SEO hold/감사 로그/지속 rate limit | [!] 실제 로그인·DB 저장 트랜잭션 검증 |
| 9 SEO/safety | [x] Mock 차단, 실제 canonical, seo_pages sitemap, ads OFF | [!] 실제 SEO 재계산 및 운영 설정 |
| 10 Checks | [x] unit/type/lint/build 및 4개 너비 E2E | [!] TEST_DATABASE_URL 통합 및 live E2E |

## 명확한 다음 작업

- [ ] Supabase 연결·migration·PostGIS/ST_Transform/ST_DWithin 실실행.
- [ ] 공식 행정구역 원본을 검토해 계층·slug registry import.
- [ ] 승인된 API 3종 operation URL/파라미터/응답 envelope 확인. 계약과 실제 JSON 필드 매핑 작성.
- [ ] 샘플 5건 → 100건 DB 검수 승인 → 전체 수집. 실제 소스에서 좌표 축 순서 확인.
- [ ] 전국 수집 건수·응답 시간·쿼터 측정. 현재 cron은 40초 수집 예산이며 긴 작업의 재개형 분할은 아직 미구현. 실제 규모에 맞게 설계·검증하기 전 자동 수집을 켜지 않음.
- [ ] 공식 진료비 원본 및 분류를 검토하고 import. 파일 업로드/preview 관리자 UI는 미구현; 현재 검증형 CLI만 있음.
- [ ] 지역 경계 기반 좌표 QA와 전국 행정구역/주소 변형 검증. 현재는 계층 이름 매칭과 대한민국 범위 검증.
- [ ] 실제 SDK의 선택 마커 표시/카드 이동/도메인 QA.
- [ ] 운영자 연락처, 개인정보 보유기간·파기절차를 확정. 정책 페이지의 운영 준비 문구를 확정본으로 교체.
- [ ] GA 콘솔의 자동 폼/검색/페이지 변경 수집을 끄고 PII 미전송 검증.
- [ ] GitHub remote/main push, Vercel import, 실제 제공 DNS/SSL/production QA.
- [ ] 관리자 권한으로 백업·복원 연습 및 RLS/DB 역할 최소권한 검증.

현재 상태를 “실데이터 1차 전환 완료”로 표현하지 않습니다.
