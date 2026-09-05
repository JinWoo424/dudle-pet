# 관리자 운영

/admin은 설정이 없으면 준비 안내, 세션이 없으면 로그인 폼을 표시합니다.
설정: ADMIN_EMAIL, scrypt 형식 ADMIN_PASSWORD_HASH, 32자 이상 ADMIN_SESSION_SECRET, DB.
비밀값/비밀번호 생성 결과를 로그나 Git에 남기지 마세요.

구현된 기능:

- 실제 DB 기준 시설 type/status 집계, 좌표/전화/지역 검토 수.
- 시설 검색 및 30행 페이지 조회.
- 24h/night/exotic/cat/parking 검증 등록: YES/NO/UNKNOWN, 출처, 근거, 확인일, 만료일.
- 신고 처리 상태와 처리 근거 저장.
- sync_runs 조회, seo_pages 조회 및 수동 noindex/보류 해제.
- 저장과 admin_audit_logs가 같은 transaction에 기록.
- HttpOnly/SameSite=Strict/production Secure cookie, Path=/, 8시간 만료.
- 정확한 Origin 확인, body 제한, DB 기반 로그인/신고 rate limit.

만료된 최신 검증을 제외할 때 과거 YES를 되살리지 않습니다.
현재 공개 정보는 current_facility_verifications view에서 읽습니다.
공식 시설 원본을 임의 수정/삭제하거나 DB 전체 reset하는 버튼은 없습니다.

아직 실제 DB 로그인/저장/동시성/RLS 테스트는 수행하지 못했습니다.
권한 모델은 단일 운영자이며 다중 관리자 역할·2FA·업로드 preview UI는 이번 구현 범위에 없습니다.
