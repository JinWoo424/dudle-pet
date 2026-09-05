# 데이터 소스 — 확인 사실과 대기 사항

| 대상 | 현재 확인 수준 | 실제 sample / mapping |
|---|---|---|
| 병원 | 사용자 제공 서비스 base: https://apis.data.go.kr/1741000/animal_hospitals | operation·요청규격·JSON 모두 미확인 |
| 동물약국 | 승인 사실은 사용자 제공; 정확한 operation 미확인 | 미확인 |
| 동물장묘업 | 승인 사실은 사용자 제공; 정확한 operation 미확인 | 미확인 |

병원 base URL은 실제 호출 operation 확인을 대체하지 않습니다. 유사 명칭의 동물용의약품/의료기기/동물전시업 API는 이 서비스의 자료로 사용하지 않았습니다.

## 실제 JSON 매핑

실제 API FIELD → NORMALIZED FIELD → DB COLUMN 매핑은 **아직 미확정**입니다.
MGTNO/BPLCNM/TRDSTATENM 등의 기존 LOCALDATA 이름을 추정 적용하지 않았습니다.
내부 표준과 DB 연결은 src/data/import-normalize.ts에 있으며, 실제 필드명은 검증된 config/public-api 계약이 공급합니다.

## 처리 경계

- 웹은 PostgreSQL만 조회하고 외부 API를 직접 호출하지 않습니다.
- 원본을 source_raw_records에 먼저 저장하고 해시로 구별합니다.
- 실제 샘플 해시 일치, 5건 normalize 검증 후 100건 모드가 열립니다.
- 성공한 100건 snapshot을 사람이 검수·승인해야 동일 계약의 full 모드가 열립니다.
- source별 lock, 정확한 total/페이지 완결성, 중복 ID/응답 변화/상태·지역 급감/폐업 급증을 검사합니다.
- 실패 시 기존 시설 transaction은 적용하지 않습니다. RAW 실패 기록은 보존합니다.
- 불확실한 중복은 HELD_ANOMALY로 보류하며 이름만으로 합치지 않습니다.
- 누락 streak는 완전한 전체 snapshot에서만 증가합니다. 누락으로 폐업/삭제를 추정하지 않습니다.
- 공공 sync는 자체 검증정보를 덮어쓰지 않습니다.

## 좌표

실제 import는 PostGIS ST_Transform의 EPSG registry로 5174 → 4326을 변환합니다.
직접 적어둔 기존 근사 proj4 변환은 운영 경로에서 제거했습니다.
원본 좌표/CRS와 확인한 축 순서를 보존하며, 한국 범위 밖·누락 좌표를 시설 중심점으로 대체하지 않습니다.
실제 API 좌표와 지역 경계/지도 일치 QA는 미실행입니다.

근거: [PostGIS ST_Transform](https://postgis.net/docs/ST_Transform.html),
[ST_DWithin의 geography 거리 단위](https://postgis.net/docs/ST_DWithin.html),
[PROJ의 EPSG 변환 registry](https://github.com/OSGeo/PROJ/blob/master/data/sql/helmert_transformation.sql).

## 지도

좌표 기반 길찾기와 주소 검색 URL은 [Kakao 공식 가이드](https://apis.map.kakao.com/web/guide/)에 맞췄습니다.
실제 키가 없어 SDK 지도·마커 표시를 검증한 것은 아닙니다.

## 공식 지역/진료비 import

- import:regions: sourceName/sourceUrl/regions 배열. 각 행 name/shortName/level/fullSlug/parentSlug. 부모 먼저 처리, 모든 계층 검증, 감사 로그.
- import:fees: sourceName/sourceUrl/sourceDate/surveyYear/rows. 항목/지역/동물/체중 차원과 nullable 가격을 검증, 파일 해시/batch/감사 로그 저장.
- 실제 원본 자료를 받지 않았으므로 두 import 모두 미실행.
- 관리자 업로드/preview 및 batch 자동 rollback UI는 아직 없음. CLI 실패는 transaction rollback.
