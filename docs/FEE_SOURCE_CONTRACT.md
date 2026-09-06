# 동물병원 진료비 공식 공개 화면 계약

확인일: 2026-09-06  
공식 기관: 농림축산식품부  
공개 화면: <https://animalclinicfee.or.kr/info/payInfo.do>

이 문서는 공개 화면의 실제 HTML과 그 화면이 정상적으로 호출하는 공개 결과만 기록한다. 수집기는 오프라인 적재 도구이며 애플리케이션 런타임은 이 사이트의 JSON 경로에 의존하지 않는다.

## 조사연도

공개 화면에는 연도 selector와 연도 request parameter가 없다. 제도소개는 조사대상을 `2025년 기준 3,950개소`로 명시하고, 농식품부의 2025-12-22 결과 발표는 20종의 2025년 조사 결과임을 명시한다. 공식 UI·공지·공개 콘텐츠에서 2026 조사 통계는 확인되지 않았다. `fee:check-latest`는 UI와 공식 공개 문구만 검사하며 자동 수집·Import하지 않는다.

## 실제 조회 방식

| UI Label | Official Value/Code | Request Parameter | Result selector/key | Normalized field |
|---|---|---|---|---|
| 시/도 | `#sido1 option[value]` (17개) | `sidoCd` / 지역목록은 `sido` | `SIDO_CD`, `ADDR1_CD`, `ADDR1_NM` | survey province |
| 시/군/구 | `/info/gugunList.json` 결과 | `sido` | `ADDR2_CD`, `ADDR2_NM` | survey city |
| 진료항목 | `data-medi-type` | `mediTypeCd` | `MEDI_TYPE_CD` | item code |
| 동물·체중 조건 | `data-animal-type` | `animalTypeCd` | `ANIMAL_TYPE_CD` | animal type / weight class |
| 전국·시도 결과 | 공개 화면의 `searchTotalPrice()` | POST `/info/searchTotalPrice.json` | `SIDO_CD=99` 및 시도 코드 | NATIONAL / PROVINCE |
| 시군구 결과 | 공개 화면의 `searchPrice()` | POST `/info/searchPrice.json` | `ADDR2_NM`, `ATTR` | CITY |
| 중간비용 | tab `#tab1`, `.map-incont1`, `#tabMidPrice` | 동일 | `MID_PRICE` | median_price |
| 평균비용 | tab `#tab2` | 동일 | `AVG_PRICE` | average_price |
| 최저비용 | tab `#tab3` | 동일 | `MIN_PRICE` | minimum_price |
| 최고비용 | tab `#tab4` | 동일 | `MAX_PRICE` | maximum_price |

요청은 `POST`, `application/x-www-form-urlencoded; charset=utf-8`, `AJAX: true`이다. 결과 단위는 원이다. 숫자·쉼표·`원`만 정수로 변환하고 빈 문자열, `-`, `없음`은 NULL로 보존한다. 응답에 표본 수 필드가 없어 `sample_count`는 NULL이다.

## 공식 Item 및 제공 조건

| 분류 | Official code | UI item | Official condition | Normalized condition |
|---|---|---|---|---|
| 진찰 | MEDIT00001 | 초진 진찰료 | ANITY00006/7/8 | 동물 구분 없음 + 5/10/20kg |
| 진찰 | MEDIT00002 | 재진 진찰료 | ANITY00006/7/8 | 동물 구분 없음 + 5/10/20kg |
| 진찰 | MEDIT00003 | 진찰에 대한 상담료 | empty | 구분 없음 |
| 입원 | MEDIT00004 | 입원비 | ANITY00006/7/8, ANITY00005 | DOG 5/10/20kg, CAT |
| 예방접종 | MEDIT00005 | 종합백신 접종비 | ANITY00001, ANITY00005 | DOG, CAT (내부 item은 각각 분리) |
| 예방접종 | MEDIT00007/8/12/9 | 광견병/켄넬코프/코로나바이러스/인플루엔자 | empty | 구분 없음 (코로나 내부 의미 DOG) |
| 혈액검사 | MEDIT00010/13/14 | 전혈구/혈액화학/전해질 | empty | 구분 없음 |
| 영상검사 | MEDIT00011/15/16/17 | X-ray/초음파/CT/MRI | ANITY00006/7/8 | 동물 구분 없음 + 5/10/20kg |
| 투약·조제 | MEDIT00018/19/20 | 심장사상충/외부기생충/광범위 구충 | empty | 공식 UI의 5kg 기준, 동물 구분 없음 |

공식 코드는 19개이며 종합백신의 DOG/CAT 조건을 별도 내부 item으로 보존하므로 공개 진료항목은 20종이다. 실제 HTML에서 발견한 조건은 총 35개이다.

## 지역과 Historical Crosswalk

공식 UI에서 17개 시도와 229개 시군구를 발견한다. 실제 계약은 로컬 전용 `data/cache/fee-region-contract-2025.json`에 저장하며 원본 HTML과 결과 snapshot은 gzip·SHA-256 metadata와 함께 `data/cache/`에 보관하고 Git에서 제외한다.

매칭 우선순위는 공식 코드+이름, 명시적 historical parent, 검증된 parent 아래 정확한 시군구 이름이다. 이름 유사도는 사용하지 않는다. 2025 전라남도·광주광역시 광역 통계는 현재 전남광주통합특별시 통계로 만들지 않는다. 여수시 등 경계가 유지된 city만 현재 ID에 연결한다. 2026년 경계가 바뀐 인천 중구·동구·서구와 current CITY가 없는 세종 city 결과는 현재 ID 없이 검토 대상으로 보존한다.

## 수집 안전성

- concurrency 1, 요청 간 최소 1초
- 429/5xx 반복 시 중단하는 제한 재시도
- content hash 검증 cache와 원자적 checkpoint
- 동일 dataset hash 중복 Import 차단
- snapshot에는 연도, scope, 지역/항목/조건, 수집시각, source URL, request fingerprint, content hash, parser version 저장
- 공개 수집 경로는 Production runtime dependency가 아님

2026 자료가 공식 UI에 공개되면 기존 2025 batch를 수정하지 않고 새 `survey_year=2026` batch로 검증·추가한다.
