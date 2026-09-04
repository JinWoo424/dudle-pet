# 관리자 운영

## 인증

MVP는 환경변수의 단일 관리자 계정을 사용한다. 비밀번호는 `scrypt$<salt>$<64-byte-hex>` 형식 hash만 저장한다. Session은 HMAC-SHA256 서명, 8시간 만료, HttpOnly, SameSite=Strict이며 production에서 Secure다. Login은 IP 기준 15분에 5회로 제한한다.

## 운영 화면

`/admin` dashboard는 시설 수, 좌표·전화 누락, 검증 대기, 외부 연결 상태를 보여준다. 후속 화면은 시설, 검증, 신고, 진료비 import, sync, SEO, 광고, guide, 로그 순으로 확장한다. 모든 route는 robots 차단과 noindex를 함께 사용한다.

## 검증

`UNKNOWN → YES/NO` 변경은 source type, URL/evidence, 검증자, 검증일, 만료일을 함께 저장하고 `admin_audit_logs`에 before/after를 남긴다. 24시간·야간 90일, 특수동물 180일, 주차·CT·MRI 365일을 기본 만료로 한다.

## 비밀번호 hash 생성 예시

운영자가 별도 안전한 Node 환경에서 `crypto.scryptSync(password, randomSalt, 64)`를 실행해 salt와 hex 결과를 조합한다. 비밀번호 원문은 shell history, 문서, Git, 대화에 남기지 않는다.

