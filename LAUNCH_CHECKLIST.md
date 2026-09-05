# 두들펫 출시 체크리스트

2026-09-05: 아직 실제 데이터 전환/배포 완료 아님. 현재 사실은 docs/BUILD_REPORT.md 참고.
마이그레이션 실행은 자동 보안 검토에서 차단되었으며, DB 대상 확인과 실행 승인 필요.

## 데이터

- [ ] 3개 API sample key를 문서와 대조하고 adapter mapping review
- [ ] mock mode 비활성화 및 화면에 가상 시설이 없는지 확인
- [ ] 전체/지역 건수와 anomaly baseline 확정
- [ ] 공공정보 기준일과 진료비 출처·조사연도 확인
- [ ] 24시간·야간 결과의 근거와 만료일 확인

## 보안

- [ ] 노출 이력이 있는 Kakao REST key 교체
- [ ] Secret이 Git/history/client bundle/log에 없는지 검사
- [ ] admin session, CSRF origin, rate limit, cron authorization 확인
- [ ] Supabase 최소권한과 backup/restore 점검

## 검색·품질

- [ ] Google/Naver verification
- [ ] robots, canonical, sitemap, structured data live 확인
- [ ] thin/noindex·orphan page 확인
- [ ] 375px, 768px, 1440px와 여수/순천/광주/서울/부산 QA
- [ ] 전화·길찾기·지도 실패 fallback·정보수정 요청 확인

## 배포·수익화

- [ ] GitHub main push와 Vercel import
- [ ] Vercel이 제공한 DNS 값으로만 `pet.dudle.co.kr` 연결
- [ ] health와 daily cron 실행 기록 확인
- [ ] AdSense는 콘텐츠·정책 검수 후 수동 활성화
- [ ] 전화 CTA 주변에 광고가 없는지 확인
