# AdSense 운영 정책

## 현재 구조

두들펫은 Auto Ads가 아닌 승인된 수동 placement만 사용한다. 광고 설정은 `src/components/ads/ad-config.ts`에서 환경변수로 중앙 관리하며 페이지나 컴포넌트에 publisher 또는 slot 값을 직접 하드코딩하지 않는다.

| Placement | 환경변수 | 노출 위치 | 노출 조건 |
| --- | --- | --- | --- |
| `HOME_CONTENT_1` | `NEXT_PUBLIC_ADSENSE_SLOT_HOME_1` | 홈 핵심 탐색 다음 | Production의 승인된 홈 placement |
| `HOSPITAL_LIST_1` | `NEXT_PUBLIC_ADSENSE_SLOT_HOSPITAL_LIST_1` | 병원 카드 6개 다음 | 총 8개 이상이며 현재 페이지에 6개 이상 |
| `PHARMACY_LIST_1` | `NEXT_PUBLIC_ADSENSE_SLOT_PHARMACY_LIST_1` | 약국 카드 6개 다음 | 총 8개 이상이며 현재 페이지에 6개 이상 |
| `COST_CONTENT_1` | `NEXT_PUBLIC_ADSENSE_SLOT_COST_CONTENT_1` | 공식 가격 요약 카드 다음 | 실제 공식 데이터가 있는 indexable `SEO_READY` 페이지이며 임시 필터가 없음 |
| `FACILITY_DETAIL_1` | `NEXT_PUBLIC_ADSENSE_SLOT_FACILITY_DETAIL_1` | 상세 지도 다음 | 영업 중이고 주소·지역·동기화일이 있는 `SEO_READY` 공개 상세 |

Publisher는 `NEXT_PUBLIC_ADSENSE_CLIENT_ID`로 관리한다. 모든 placement는 `ADSENSE_ENABLED=true`, Vercel Production, canonical Production hostname, publisher 및 해당 slot이 모두 유효할 때만 실제 광고를 렌더링한다. 값이 없거나 정책을 충족하지 않으면 광고 DOM, 예약 공간, Google 요청을 모두 만들지 않는다.

## Bootstrap 및 초기화

실제 광고가 있는 페이지에서만 `dudle-adsense-bootstrap`을 한 번 로드한다. 페이지별로 Google 원본 `<script>`를 복사하지 않는다. 각 `ins.adsbygoogle`은 `data-dudle-ad-initialized`와 Google의 `data-adsbygoogle-status`를 확인한 뒤 한 번만 초기화한다.

Client navigation과 React 재렌더링에서도 다음을 유지한다.

- 페이지 내 bootstrap script 최대 1개
- 광고 element당 `adsbygoogle.push` 최대 1회
- 동일 placement 중복 mount 금지
- `TagError`, `already have ads`, `No slot size` 오류 0

## 노출 및 UX 정책

- 한 페이지 유형별 승인된 광고는 현재 최대 1개다.
- 목록 광고는 카드 grid item이 아닌 독립 full-width block이다.
- 전화·길찾기·상세보기 CTA 바로 옆에 광고를 두지 않는다.
- 지도, 공식 가격 통계, 시설 카드와 광고를 혼동시키는 스타일을 사용하지 않는다.
- 검색, 내 주변, 관리자, 오류, 비공개, `REVIEW_REQUIRED`, noindex 및 데이터 부족 페이지에는 광고를 표시하지 않는다.
- 작은 지역에 광고를 강제하지 않는다. 병원·약국 목록은 총 8개와 현재 페이지 6개 조건을 모두 충족해야 한다.

`FUNERAL_CONTENT_1`과 `HOME_CONTENT_2`는 코드상 예약 이름만 있고 slot mapping과 실제 광고가 없다. 장례시설은 대부분 지역별 데이터가 매우 적고 홈은 현재 광고 1개로 충분하므로 둘 다 당분간 활성화하지 않는다.

## Preview 정책

Vercel Preview는 다음 값을 유지한다.

```text
ADSENSE_ENABLED=false
ADSENSE_LAYOUT_PREVIEW=true
```

승인된 placement는 레이아웃 확인용 placeholder만 표시한다. 실제 AdSense script, `ins.adsbygoogle`, Google 광고 요청은 0이어야 한다. Production에서는 `ADSENSE_LAYOUT_PREVIEW=false`여야 하며 placeholder가 없어야 한다.

## Auto Ads 정책

코드에는 Auto Ads, Anchor, Vignette, Overlay 또는 광고용 Sticky 구현을 두지 않는다. AdSense Dashboard의 Auto Ads 설정은 저장소 코드만으로 검증할 수 없으므로 배포 전 Dashboard에서도 OFF를 확인한다.

## 새 수동 광고 추가 절차

1. AdSense에서 반응형 광고 단위를 생성한다.
2. 공개 식별자인 `data-ad-slot` 값을 확인한다.
3. 명명된 환경변수와 중앙 `ad-config.ts` mapping을 추가한다.
4. 데이터 품질, indexability, 최소 콘텐츠 수와 삽입 위치를 코드 정책으로 제한한다.
5. Preview에서 placeholder 위치와 광고 예약 공간을 확인한다.
6. Preview의 Google script/request가 0인지 확인한다.
7. 375, 390, 430, 768, 1440px에서 overflow, CTA, 지도 및 footer 충돌을 검사한다.
8. lint, typecheck, test, build와 secret scan을 통과한다.
9. 기능 브랜치를 `--no-ff`로 main에 병합하고 다시 전체 검사를 실행한다.
10. Production 환경변수를 설정하고 비강제 push한다.
11. Production에서 slot, 실제 Google request, 초기화 1회와 filled/unfilled 상태를 확인한다.
12. CLS, SEO, Kakao Map, DB/TLS, HTTP 500과 runtime log 회귀를 확인한다.

## 배포 체크리스트

- `ADSENSE_ENABLED=true`는 Production에만 설정
- `ADSENSE_LAYOUT_PREVIEW=false` 확인
- canonical hostname에서만 script가 로드되는지 확인
- page type별 광고 수가 설계 최대값 1을 넘지 않는지 확인
- noindex/저데이터 페이지의 광고 DOM·공간·요청이 모두 0인지 확인
- `https://dudle.co.kr/ads.txt`가 HTTP 200이고 publisher와 일치하는지 확인
- Auto Ads와 overlay 계열 광고가 OFF인지 Dashboard에서 확인
- Production QA 시간대 EMAXCONNSESSION, HTTP 500, DB/TLS, hydration 오류가 0인지 확인

## Analytics

GA ID가 있을 때만 analytics script를 로드한다. 검색, 지역·시설 조회, 전화·길찾기, nearby, 검증 filter, 신고 event와 `page_type`을 전송한다. 정확한 브라우저 위치와 secret은 analytics로 보내지 않는다.

