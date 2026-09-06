# 데이터 소스 — 확인 사실과 대기 사항

## 2025 동물병원 진료비

- 공식 화면: https://animalclinicfee.or.kr/info/payInfo.do
- 농림축산식품부 발표: https://www.mafra.go.kr/home/5109/subview.do?enc=Zm5jdDF8QEB8JTJGYmJzJTJGaG9tZSUyRjc5MiUyRjU3NjIzNiUyRmFydGNsVmlldy5kbyUzRg%3D%3D
- 2025년 조사 대상은 3,950개소이며, 20개 항목의 전국·시도·시군구 최저/최고/평균/중간비용을 공개한다.
- 2026-09-05 확인 시 공식 CSV/XLSX/TXT/OpenAPI/Download는 찾지 못했다. 공개 화면이 호출하는 문서화되지 않은 JSON endpoint는 production dependency로 사용하지 않는다.
- 공식 machine-readable 파일을 공급받기 전에는 실제 진료비를 Import하지 않으며, 빈 값은 0원으로 바꾸지 않는다.
- 공식 파일은 관리자/CLI Preview에서 20개 항목, 공식 명칭·조건, historical region, 가격 범위, 중복, 파일 hash를 검증한 뒤에만 versioned batch로 적재한다.
- 조사 당시 `survey_province_name`/`survey_city_name`과 현재 `current_region_id`를 분리한다. 2025년 전라남도와 광주광역시 통계를 현재 전남광주통합특별시 통계로 합산하지 않는다.

공식 항목명과 화면 조건은 `src/data/fee-catalog.ts`, Import 계약과 안전 gate는 `src/data/fee-import.ts`가 기준이다.

## 공식 Region Master

- 공식 출처: 행정표준코드관리시스템 법정동코드목록조회 — https://www.code.go.kr/stdcode/regCodeL.do
- 실제 다운로드: 공식 페이지 세션에서 `POST /etc/codeFullDown.do`의 `codeseId=법정동코드`로 받은 “법정동 코드 전체자료” ZIP.
- 실제 파일: `data/official/legal-dong-codes-2026-09-05.zip` 및 CP949에서 UTF-8로 변환한 동명 TXT. 이 폴더는 재배포·Git 추적 대상이 아니다.
- 실제 제공 컬럼: 법정동코드, 법정동명, 폐지여부. 제공되지 않은 생성일·폐지일·좌표는 추측하지 않고 NULL로 둔다.
- 원본 53,387행 중 리 단위를 제외한 공개 계층 14,143행을 적재했다. 현존/폐지 이력을 `is_active`로 구분한다.
- 현존 계층: PROVINCE 16, CITY 268, DISTRICT 5,067. 폐지 계층: PROVINCE 10, CITY 243, DISTRICT 8,539.
- 고아 parent 0, duplicate official_code 0, duplicate full_slug 0.
- 2026-07-01 현재 공식 hierarchy는 `전남광주통합특별시(1200000000) → 여수시(1213000000)`이며 canonical slug는 `jeonnam-gwangju/yeosu`다.
- 기존 `jeonnam/yeosu`는 `region_aliases`를 통해 canonical URL로 308 redirect한다. `jeonnam`, `gwangju`, 기존 순천·광양 URL도 alias로 보존한다.
- slug는 공식 코드 기반 fallback을 사용하며 임의 번역하지 않는다. 기존 핵심 slug와 명시한 canonical slug만 안정적으로 보존한다.
- center 좌표는 공식 전체자료에 없으므로 NULL이다.

Importer: `npm run import:regions -- --file=<공식 TXT 또는 CSV>`. UTF-8을 우선 검증하고 실패하면 CP949/EUC-KR로 해석한다. 10자리 코드는 text로 보존하며 orphan이나 중복 키가 있으면 전체 transaction을 rollback한다.

| 대상 | 현재 확인 수준 | 실제 sample / mapping |
|---|---|---|
| 병원 | GET https://apis.data.go.kr/1741000/animal_hospitals/info | 2026-09-05 실제 JSON 5건 확인; hospital.json 저장 |
| 동물약국 | GET https://apis.data.go.kr/1741000/animal_pharmacies/info | 2026-09-05 실제 JSON 5건 확인; pharmacy.json 저장 |
| 동물장묘업 | GET https://apis.data.go.kr/1741000/animal_cremation/info | 2026-09-05 실제 JSON 5건 확인; funeral.json 저장 |

병원 operation은 실제 HTTP 200 및 성공 코드 0으로 검증했습니다. 요청은 pageNo=1, numOfRows=5, type=json이며 serviceKey 값과 인증정보 포함 URL은 저장하지 않습니다. 공식 데이터 설명: https://www.data.go.kr/data/15045050/fileData.do (이 페이지는 파일데이터 설명이며 API operation 증거는 실제 호출입니다). 다른 업종의 API는 사용하지 않았습니다.

위 표의 약국·장묘업 대기 상태는 2026-09-05 실제 검증으로 해소됐다.

- 동물약국 공식 문서: https://www.data.go.kr/data/15155272/openapi.do
- 동물약국 operation: `GET https://apis.data.go.kr/1741000/animal_pharmacies/info`, operationId `info`
- 동물장묘업 공식 문서: https://www.data.go.kr/data/15155065/openapi.do
- 동물장묘업 operation: `GET https://apis.data.go.kr/1741000/animal_cremation/info`, operationId `info`
- 두 API 모두 `serviceKey`, `pageNo`, `numOfRows`, `returnType=json`을 사용한다. 인증키가 포함된 완성 URL은 저장하거나 출력하지 않는다.

## 실제 JSON 매핑

응답 배열은 response.body.items.item, 전체 건수는 response.body.totalCount, 성공 코드는 response.header.resultCode의 문자열 0입니다. 실제 샘플 5건의 모든 키를 확인했습니다. 계약은 config/public-api/hospital.json, 인증정보 제거 샘플은 docs/api-samples/hospital.json입니다.

| API Field | Normalized Field | Database Column (facilities) | 변환 규칙 |
|---|---|---|---|
| MNG_NO | externalId | public_source_id | 문자열 보존; source와 복합 유일키 |
| BPLC_NM | name | name / normalized_name | 원문 trim; 검색용 NFKC·공백 정리·소문자 |
| SALS_STTS_CD | publicStatusCode | public_status_code / business_status | 전국 응답으로 확인: 01=OPEN, 02=TEMP_CLOSED, 03=CLOSED, 04=SUSPENDED. 원문 코드·명칭도 함께 보존 |
| SALS_STTS_NM | publicStatusName | public_status_name | 원문 보존 |
| DTL_SALS_STTS_CD | publicDetailStatusCode | public_detail_status_code | 앞자리 0 포함 문자열 보존 |
| DTL_SALS_STTS_NM | publicDetailStatusName | public_detail_status_name | 원문 보존 |
| TELNO | phone | phone_raw / phone_normalized | 원문 보존; 숫자 9~11자리만 정규화, 없거나 부적합하면 null |
| ROAD_NM_ADDR | roadAddress | road_address | 원문 trim; 지역·중복 비교 시 주소 정규화 |
| LOTNO_ADDR | jibunAddress | jibun_address | 원문 trim; 도로명주소 없을 때 지역 비교에 사용 |
| LCPMT_YMD | licenseDate | license_date | YYYY-MM-DD 유효 날짜 검사; 빈 문자열 null |
| LCPMT_RTRCN_YMD | licenseCancelDate | license_cancel_date | 키 확인; 샘플 값은 공백, null; 향후 값 날짜 검사 |
| CLSBIZ_YMD | closedDate | closed_date | 키 확인; 샘플 값은 공백, null; 향후 값 날짜 검사 |
| TCBIZ_BGNG_YMD | temporaryCloseStart | temporary_close_start | 키 확인; 샘플 값은 공백, null; 향후 값 날짜 검사 |
| TCBIZ_END_YMD | temporaryCloseEnd | temporary_close_end | 키 확인; 샘플 값은 공백, null; 향후 값 날짜 검사 |
| ROBIZ_YMD | reopenDate | reopen_date | 키 확인; 샘플 값은 공백, null; 향후 값 날짜 검사 |
| CRD_INFO_X | sourceX | source_x / longitude / location | 원본 문자열 보존; 5174 easting, PostGIS로 4326 변환 후 범위 검사 |
| CRD_INFO_Y | sourceY | source_y / latitude / location | 원본 문자열 보존; 5174 northing, 누락 좌표 대체 금지 |
| LAST_MDFCN_PNT | sourceUpdatedAt | source_updated_at | YYYY-MM-DD HH:mm:ss를 한국시간 +09:00으로 해석 |
| ROAD_NM_ZIP | postalCode | postal_code | 앞자리 0 포함 문자열 보존 |
| OPN_ATMY_GRP_CD | publicLocalCode | public_local_code | 문자열 보존; 검증된 지역 기준 데이터 없이 region_id 추정 금지 |

DAT_UPDT_PNT는 제공 데이터 갱신시각으로 RAW에 보존하며 LAST_MDFCN_PNT와 혼동하지 않습니다. 24시간·야간·특수동물·주차는 이 응답에 없으므로 UNKNOWN을 유지합니다.

## 동물약국·동물장묘업 실제 JSON 매핑

두 API의 실제 5건 JSON은 병원과 동일한 응답 envelope 및 아래 필드를 제공했다. 인증정보 제거 샘플은 `docs/api-samples/pharmacy.json`, `docs/api-samples/funeral.json`에 저장했다.

| API Field | Normalized Field | Database Column | 변환 규칙 |
|---|---|---|---|
| MNG_NO | externalId | facilities.public_source_id | 원문 문자열; source와 복합 유일키 |
| BPLC_NM | name | name / normalized_name | 원문 보존, 검색·중복용 정규화명 별도 생성 |
| SALS_STTS_CD | publicStatusCode | public_status_code / business_status | 01 OPEN, 02 TEMP_CLOSED, 03 CLOSED, 04 SUSPENDED |
| SALS_STTS_NM | publicStatusName | public_status_name | 원문 보존 |
| DTL_SALS_STTS_CD | publicDetailStatusCode | public_detail_status_code | 앞자리 0 포함 문자열 보존 |
| DTL_SALS_STTS_NM | publicDetailStatusName | public_detail_status_name | 원문 보존 |
| TELNO | phone | phone_raw / phone_normalized | 원문 보존; 유효 숫자 전화만 정규화 |
| ROAD_NM_ADDR | roadAddress | road_address | 원문 보존; 지역/중복 비교만 정규화 |
| LOTNO_ADDR | jibunAddress | jibun_address | 원문 보존; 도로명주소 없을 때 보조 |
| LCPMT_YMD | licenseDate | license_date | 유효 YYYY-MM-DD, 공백은 NULL |
| LCPMT_RTRCN_YMD | licenseCancelDate | license_cancel_date | 유효 날짜, 공백은 NULL |
| CLSBIZ_YMD | closedDate | closed_date | 유효 날짜, 공백은 NULL |
| TCBIZ_BGNG_YMD | temporaryCloseStart | temporary_close_start | 유효 날짜, 공백은 NULL |
| TCBIZ_END_YMD | temporaryCloseEnd | temporary_close_end | 유효 날짜, 공백은 NULL |
| ROBIZ_YMD | reopenDate | reopen_date | 유효 날짜, 공백은 NULL |
| CRD_INFO_X | sourceX | source_x / longitude / location | EPSG:5174 easting 원문 보존 후 PostGIS 4326 변환 |
| CRD_INFO_Y | sourceY | source_y / latitude / location | EPSG:5174 northing 원문 보존 후 PostGIS 4326 변환 |
| LAST_MDFCN_PNT | sourceUpdatedAt | source_updated_at | 한국시간 `+09:00`으로 해석 |
| ROAD_NM_ZIP | postalCode | postal_code | 문자열 보존 |
| OPN_ATMY_GRP_CD | publicLocalCode | public_local_code | 문자열 보존; region 추정에 사용하지 않음 |

동물약국의 재고·취급 약품·동물 전문성은 응답에 없으므로 만들지 않는다. 장묘업의 화장·봉안·장례식·추모·운구 제공 여부도 응답에 없으므로 모든 관련 feature를 UNKNOWN으로 유지한다.

### 동물약국 검증 및 전국 동기화

- 100건 기준선: 수신/RAW/신규 100, region 100, 좌표 93·누락 7·오류 0, OPEN 99·CLOSED 1, 중복/검토/오류 0.
- 전국 DRY RUN: 20,851, OPEN 13,628, CLOSED 7,116, TEMP_CLOSED 20, SUSPENDED 87.
- DRY RUN region 20,826(99.88%), 좌표 19,539·누락 1,312·오류 0, source ID 중복/orphan 0, 중복 후보 1,851.
- 실제 Sync: 42개 배치 모두 성공, 신규 19,047, 기존 100 갱신, 검토 보류 1,704, 실패 배치 0.
- 실제 DB: 19,147, OPEN 13,373, CLOSED 5,687, TEMP_CLOSED 20, SUSPENDED 67. region 미확정 25, PostGIS location 17,835.

### 동물장묘업 검증 및 전체 동기화

- 100건 기준선: 수신/RAW/신규 100, region 100, 좌표 93·누락 7·오류 0, OPEN 85·CLOSED 2·TEMP_CLOSED 6·SUSPENDED 7.
- 전체 104건 DRY RUN: OPEN 88, CLOSED 3, TEMP_CLOSED 6, SUSPENDED 7. region 104/104, 좌표 95·누락 9·오류 0, 중복/source ID 중복/orphan 0.
- 실제 Sync: 1개 배치 성공, 신규 4, 기존 100 갱신, 검토 0.
- 실제 DB: 104, OPEN 88, CLOSED 3, TEMP_CLOSED 6, SUSPENDED 7, PostGIS location 95.

### 100건 승인 기준선

현재 계약 체크섬으로 병원 100건 sample을 재검증하고 `sync_source_snapshots.baseline_metrics`에 승인 기록을 남겼다. API 수신 100, RAW 100, region 매칭 100, 좌표 변환 87, 좌표 없음 13, 좌표 오류 0, 중복 0, 검토 0, 오류 0이다. 현재 DB에 이미 있던 동일 source ID를 갱신한 실행이므로 inserted 0, updated 100이며 상태 분포는 OPEN 100이다.

### 여수 중복 보류 7건

검증된 `cond[ROAD_NM_ADDR::LIKE]` 필터와 응답 주소 guard로 받은 여수 36건은 영업 15·폐업 21이다. 보류됐던 아래 7건은 모두 관리번호(source ID)와 인허가일이 다른 폐업 이력이고, 동일 장소의 후속 인허가와 구분되므로 `KEEP_SEPARATE`로 승인했다. 삭제하거나 현재 영업 시설에 병합하지 않았다.

| public_source_id / 관리번호 | 사업장명 | 인허가일 | 폐업일 | 판정 |
|---|---|---|---|---|
| 578500001020020007 | 여천동물병원 | 2002-12-12 | 2014-07-11 | KEEP_SEPARATE |
| 578500001020060002 | 늘사랑 | 2006-05-08 | 2006-06-30 | KEEP_SEPARATE |
| 578500001020060005 | 늘사랑동물병원 | 2006-07-28 | 2008-12-18 | KEEP_SEPARATE |
| 578500001020100001 | 늘사랑동물병원 | 2010-05-27 | 2012-01-20 | KEEP_SEPARATE |
| 578500001020120001 | 늘사랑동물병원 | 2012-02-01 | 2013-01-02 | KEEP_SEPARATE |
| 578500001020150001 | 늘사랑동물병원 | 2015-07-30 | 2017-01-31 | KEEP_SEPARATE |
| 578500001020170001 | 웅천동물병원 | 2017-01-03 | 2025-11-12 | KEEP_SEPARATE |

모든 판정 근거에는 정규화명, 도로명·지번 주소, 정규화 전화, 원본 X/Y, source 수정일을 포함해 `facility_duplicate_reviews`에 기록했다. 명확한 법적 승계 관계까지 원문에서 확인되지는 않아 관계 테이블은 만들지 않았다.

### 전국 병원 DRY RUN 및 동기화

- 쓰기 없는 DRY RUN: 10,617건, OPEN 5,474, CLOSED 5,056, TEMP_CLOSED 28, SUSPENDED 59.
- region 매칭 10,601건(99.849%). 미확정 16건은 모두 개편 전 인천 중구·서구 주소로, 현행 구를 추측하지 않고 REVIEW_REQUIRED로 유지했다. 세종은 공식 단층 구조에 따라 47/47 매칭했다.
- 좌표: VALID 9,207, MISSING 1,410, INVALID 0. source ID duplicate 0, orphan region 0.
- 중복 후보 311건은 DRY RUN에서 검토 대상으로 계산했다. 실제 적재 당시 이미 같은 source ID로 존재하던 레코드를 제외한 246건을 병합하지 않고 RAW `HELD_ANOMALY` 및 `facility_duplicate_reviews.REVIEW_REQUIRED`로 보존했다.
- 실제 배치 동기화: 22개 배치(500건, 마지막 117건) 모두 성공. 신규 10,235, 기존 136 갱신, 검토 보류 246, 배치 실패 0, 84.6초.
- 적재 후 병원 10,371: OPEN 5,470, CLOSED 4,814, TEMP_CLOSED 28, SUSPENDED 59. PostGIS location 8,961, 좌표 누락 1,410, 좌표 오류 0.
- 완전한 snapshot에서만 누락 streak를 갱신하며, 누락은 `MISSING_FROM_SOURCE`일 뿐 CLOSED가 아니다.

상세 DRY RUN 결과와 16개 시·도 통계는 `docs/reports/hospital-national-dry-run.json`에 있다. 원본 전체 cache는 Git에서 제외된 `data/official/hospital-national-dry-run.json`이며 인증정보를 포함하지 않는다.

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
전국 좌표 변환 후 지역 페이지 단위 Kakao marker와 실제 시설 카드 연동을 QA했습니다. 좌표 없는 시설은 목록에 남고 지도에서만 제외됩니다.

근거: [PostGIS ST_Transform](https://postgis.net/docs/ST_Transform.html),
[ST_DWithin의 geography 거리 단위](https://postgis.net/docs/ST_DWithin.html),
[PROJ의 EPSG 변환 registry](https://github.com/OSGeo/PROJ/blob/master/data/sql/helmert_transformation.sql).

## 지도

좌표 기반 길찾기와 주소 검색 URL은 [Kakao 공식 가이드](https://apis.map.kakao.com/web/guide/)에 맞췄습니다.
설정된 브라우저 키로 서울·부산·여수·순천·전남광주 통합권·대구·인천·대전·울산·제주 지역 페이지의 SDK 로드와 실제 marker 렌더링을 검증했습니다. 지도는 각 지역의 현재 페이지 OPEN 시설만 사용하며 전국 수천 건을 한 지도에 표시하지 않습니다.

## 공식 지역/진료비 import

- import:regions: sourceName/sourceUrl/regions 배열. 각 행 name/shortName/level/fullSlug/parentSlug. 부모 먼저 처리, 모든 계층 검증, 감사 로그.
- import:fees: sourceName/sourceUrl/sourceDate/surveyYear/rows. 항목/지역/동물/체중 차원과 nullable 가격을 검증, 파일 해시/batch/감사 로그 저장.
- 실제 원본 자료를 받지 않았으므로 두 import 모두 미실행.
- 관리자 업로드/preview 및 batch 자동 rollback UI는 아직 없음. CLI 실패는 transaction rollback.
