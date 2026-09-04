# 데이터 소스 운영

## 공공데이터

| 구분 | source type | endpoint | mapping |
|---|---|---|---|
| 동물병원 | `MOIS_ANIMAL_HOSPITAL` | `https://apis.data.go.kr/1741000/animal_hospitals` | sample 확인 전 잠금 |
| 동물약국 | `MOIS_ANIMAL_PHARMACY` | 환경변수 설정 필요 | sample 확인 전 잠금 |
| 동물장묘업 | `MOIS_PET_FUNERAL` | 환경변수 설정 필요 | sample 확인 전 잠금 |

외부 응답은 `source_raw_records`에 먼저 저장하고 checksum으로 중복을 구분한다. adapter는 실제 sample key가 확인되기 전 production mapping을 수행하지 않는다.

## Sample inspection

`.env.local`에 service key와 endpoint를 둔 뒤 `pnpm inspect:public-api`를 실행한다. source별 5건을 `docs/api-samples/*.json`에 저장하고 실제 top-level item key를 출력한다. Key나 Secret이 sample 파일에 포함되지 않는지 확인한 뒤에만 commit한다.

## 좌표

원본 `source_x`, `source_y`, `source_crs`를 보존한다. 기본 CRS 후보는 EPSG:5174이나 source 문서를 확인해야 한다. 변환 결과가 대한민국 범위를 벗어나면 `REVIEW_REQUIRED`이며 임의 좌표를 만들지 않는다.

## 동기화 안전장치

- timeout 15초, 최대 3회 exponential backoff
- source별 독립 실행과 `sync_runs` 기록
- 1회 누락은 `missing_streak`만 증가
- 전체 20% 감소, 지역 50% 감소, 폐업 급증은 apply 차단
- API 장애 시 공식 CSV import로 대체할 수 있도록 batch 경계를 유지

## 진료비

공식 파일을 admin에서 preview → validation → region matching → confirm 순으로 import한다. `fee_import_batches`로 원본 hash와 결과를 관리하며 rollback은 batch id 단위로 한다. 개별 병원 가격으로 연결하지 않는다.

