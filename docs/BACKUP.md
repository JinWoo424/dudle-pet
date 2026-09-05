# 백업 및 복구

아래는 운영 정책 초안입니다. 이 작업에서 백업을 생성하거나 복원을 검증한 것은 아닙니다.

## 우선순위

1. 자체 검증: `facility_features`, `facility_verifications`, `facility_hours`
2. 사용자·관리: `user_reports`, `admin_audit_logs`
3. Import/변경: `fee_import_batches`, `medical_fee_statistics`, `facility_changes`
4. 재수집 가능한 공공 원본과 시설 정규화 데이터

## 정책

- Supabase의 사용 가능한 자동 backup과 별도로 주 1회 logical export를 암호화 보관한다.
- 검증·신고·audit 테이블은 매일 증분 export한다.
- 보관기간은 일간 14개, 주간 8개, 월간 12개를 기본으로 하되 provider 제한에 맞춰 조정한다.
- 복구 연습은 분기 1회 별도 project에서 수행하고 RPO/RTO와 검증 결과를 기록한다.
- Backup에는 DB credential을 포함하지 않으며 접근권한을 production 운영자에게만 둔다.

## 복구 순서

schema migration → regions/facilities → 자체 검증 → 진료비 → 신고/audit → count/SEO 재계산 → cache revalidate 순으로 수행한다. 공공 source는 마지막 성공 기준 이후를 재수집한다.
