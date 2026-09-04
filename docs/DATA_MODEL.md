# 데이터 모델

## 설계 원칙

- UUID 기본키, snake_case physical schema, UTC timestamp 저장과 Asia/Seoul 표시를 사용한다.
- 공공 원본(`source_raw_records`)과 정규화 시설(`facilities`)을 분리한다.
- 공공 정보와 자체 검증(`facility_features`, `facility_verifications`, `facility_hours`)을 분리한다.
- 폐업·누락 시설은 삭제하지 않는다. `is_active`, status와 연속 누락 횟수로 이력을 보존한다.
- 좌표 원본과 CRS를 보존하고 유효한 좌표만 `geography(Point,4326)`로 만든다.

## 핵심 관계

```text
regions 1 ── * facilities 1 ── 1 facility_features
                         ├── * facility_verifications
                         ├── * facility_hours
                         ├── * facility_changes
                         └── * user_reports

source_raw_records ──(source/external id)── facilities
sync_runs ── source별 수집 실행 이력

fee_import_batches 1 ── * medical_fee_statistics * ── 1 regions
regions 1 ── * seo_pages
```

## 상태 모델

- `business_status`: OPEN, CLOSED, TEMP_CLOSED, SUSPENDED, UNKNOWN
- `tri_state`: YES, NO, UNKNOWN
- `geo_status`: VALID, MISSING, INVALID, REVIEW_REQUIRED
- `verification_status`: VALID, EXPIRING, EXPIRED, UNVERIFIED
- `processing_status`: PENDING, PROCESSED, FAILED, HELD_ANOMALY
- `seo_status`: SEO_READY, NOINDEX_LOW_DATA, NOINDEX_DUPLICATE, NOINDEX_MANUAL
- `monetization_status`: FULL, LIMITED, OFF

## 공간 검색

`facilities.location`은 `geography(Point,4326)`이며 GIST index를 둔다. 거리 검색은 longitude/latitude/radius를 parameter로 전달하고 `ST_DWithin`으로 먼저 제한한 뒤 `ST_Distance`로 정렬한다. 브라우저에서 받은 사용자 좌표는 DB에 저장하지 않는다.

## 누락·이상 감지

source별 `missing_streak`을 증가시키며 1회 누락으로 상태를 닫지 않는다. 전체 수량 20% 이상 감소, 지역 50% 이상 감소, 폐업 급증은 destructive apply를 중단하고 raw와 sync failure/anomaly 기록만 남긴다.

## 세부 스키마

실행 가능한 정의는 `src/db/schema.ts`와 `drizzle/0000_initial.sql`을 source of truth로 사용한다. PostGIS처럼 ORM이 완전히 표현하지 못하는 제약·함수·index는 parameterized SQL과 migration에서 관리한다.

