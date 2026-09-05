# 공식 API 계약

hospital.json, pharmacy.json, funeral.json을 이 폴더에 두면 서버/CLI가 읽습니다.
아직 공식 operation/응답이 확인되지 않아 실제 계약 JSON은 생성하지 않았습니다.
테스트 폴더의 fixture 계약은 합성 테스트 전용이며 실서비스 규격이 아닙니다.

src/data/adapters/contract.ts의 Zod 스키마가 정확한 형식입니다.

필수 공통 정보:

- officialDocumentUrl: 공공데이터포털 또는 행정안전부의 확인한 문서.
- verifiedAt: 확인 날짜.
- endpoint: apis.data.go.kr의 정확한 HTTPS operation URL. query/인증키 포함 금지.
- request.keyParameter/pageParameter/sizeParameter: 공식 문서에서 확인한 파라미터명.
- request.fixed: JSON 형식 등 공식 고정 파라미터. 비밀값 저장 금지.
- response.itemsPath/totalPath/resultCodePath: 실제 JSON 경로를 문자열 배열로 기록.
- response.successCodes: 공식 성공 코드 목록.

mapping은 5건 샘플 확인 후에만 작성합니다:

- sampleSha256: 저장된 docs/api-samples/<source>.json 파일의 SHA256.
- fields: mappedFields에 있는 내부 항목마다 **실제 필드명** 또는 문서에 없음을 뜻하는 null.
- statusField/statuses: 실제 코드/표기를 영업 상태에 명시적으로 연결. 모르는 값은 UNKNOWN.
- sourceCrs: 현재 구현은 문서에서 EPSG:5174임을 확인한 소스만 지원.
- coordinateOrder: EASTING_NORTHING 또는 NORTHING_EASTING. X/Y라는 이름만 보고 추측하지 않음.
- sourceDateFormat: ISO_OFFSET / YYYYMMDDHHmmss_KST / YYYY-MM-DD HH:mm:ss_KST 중 확인한 형식.

정확한 규격이 다르면 스키마/adapter를 실제 근거에 맞게 확장하세요. 실제 API를 현재 코드에 억지로 끼워 맞추지 마세요.
Service key는 PUBLIC_DATA_SERVICE_KEY에만 저장합니다. URL·JSON·샘플·Git에 저장하지 않습니다.
