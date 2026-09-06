# 공식 진료비 Import 계약

현재 공식 사이트는 2025년 통계를 화면으로 공개하지만 CSV/XLSX/TXT/OpenAPI 다운로드는 확인되지 않았다. 화면 내부의 문서화되지 않은 JSON 요청은 production 수집원으로 사용하지 않는다. 공식 machine-readable 파일을 공급받으면 원본 구조를 먼저 확인한 뒤 아래 내부 JSON 계약으로 변환한다.

```json
{
  "sourceName": "농림축산식품부 동물병원 진료비용 현황 조사 및 공개",
  "sourceUrl": "https://animalclinicfee.or.kr/",
  "sourceDate": "YYYY-MM-DD",
  "surveyYear": 2025,
  "rows": [
    {
      "regionLevel": "NATIONAL | PROVINCE | CITY",
      "surveyRegionCode": null,
      "surveyProvinceName": null,
      "surveyCityName": null,
      "currentRegionSlug": null,
      "categoryCode": "CONSULTATION",
      "itemCode": "initial-consultation",
      "itemName": "초진 진찰료",
      "animalType": "NOT_APPLICABLE",
      "weightClass": "KG_5",
      "minimumPrice": null,
      "medianPrice": null,
      "averagePrice": null,
      "maximumPrice": null,
      "sampleCount": null
    }
  ]
}
```

위 숫자 필드의 `null`은 자료 없음이며 0원이 아니다. 실제 값은 0 이상의 정수 또는 쉼표/`원`이 포함된 정수 문자열만 허용한다. 공식 20개 항목 전체와 각 항목의 허용 동물·체중 조합은 [fee-catalog.ts](../src/data/fee-catalog.ts)가 기준이다.

## Historical Region

- `surveyProvinceName`, `surveyCityName`, `surveyRegionCode`에는 2025년 원문을 저장한다.
- `currentRegionSlug`는 관리자가 확인한 현재 공식 Region crosswalk만 입력한다. 이름 유사도로 자동 추정하지 않는다.
- 현재 통합 광역단체에 대응하는 과거 공식 Province 통계가 없다면 `currentRegionSlug`를 비워 `HISTORICAL_ONLY`로 보존한다.
- 2025년 `전라남도 여수시` 행은 현재 여수시 slug에 연결할 수 있지만, 2025년 전라남도와 광주광역시 Province 통계를 합산해 현재 통합 Province 통계를 만들 수 없다.

## Preview와 versioning

```text
pnpm import:fees official-2025.json --preview
pnpm import:fees official-2025.json --commit
pnpm import:fees --rollback BATCH_UUID
```

Preview는 전체/정상행, 현재·historical 지역 매칭, 가격 parsing, min/max, median/average 범위, duplicate dimension, 누락 항목, 동일 file hash를 검사한다. Rollback은 batch 상태만 `ROLLED_BACK`으로 바꾸며 통계 행과 감사 이력을 보존한다.
