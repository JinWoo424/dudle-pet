# 두들펫 설정 체크리스트

- [ ] Node.js와 pnpm 설치
- [ ] `.env.example`을 `.env.local`로 복사
- [ ] Supabase pooled `DATABASE_URL`, direct `DIRECT_URL` 설정
- [ ] Supabase에서 migration 실행 및 PostGIS 확인
- [ ] 공공데이터 서비스 키 설정
- [ ] 실제 sample로 병원/약국/장례 adapter mapping 확정
- [ ] 노출 이력이 있는 Kakao REST key를 새 키로 교체한 뒤 서버 기능 활성화
- [ ] Kakao JavaScript key 및 허용 domain 확인
- [ ] admin 비밀번호 hash와 32-byte 이상 session secret 설정
- [ ] cron secret 설정
- [ ] production에서 `USE_MOCK_DATA=false` 확인
- [ ] GitHub remote 연결 후 기본 브랜치를 `main`으로 변경·push
- [ ] Vercel에서 `dudle-pet` import 및 환경변수 입력
- [ ] Vercel이 제시한 DNS 값만 `pet.dudle.co.kr`에 적용

