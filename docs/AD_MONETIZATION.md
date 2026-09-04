# 광고와 분석 정책

## 기본 상태

`ADSENSE_ENABLED=false`가 기본이다. true일 때만 전역 script를 1회 load하며 publisher id는 환경변수에서 읽는다. Slot id는 `AdSlot` 중앙 설정에만 둔다.

## 노출

- FULL: 품질점수 75 이상, 최대 2–3개
- LIMITED: 품질점수 55–74, 최대 1개
- OFF: thin page, 검색, nearby, admin, 404, error 또는 품질점수 55 미만

전화·길찾기 버튼 인접 영역에는 광고를 두지 않는다. 클릭을 유도하는 문구와 콘텐츠보다 많은 광고를 금지한다.

## Analytics

GA id가 있을 때만 script를 load한다. 검색, 지역·시설 조회, 전화·길찾기, nearby, 검증 filter, 신고 event와 `page_type`을 전송한다. 정확한 브라우저 위치와 Secret은 analytics로 보내지 않는다.

