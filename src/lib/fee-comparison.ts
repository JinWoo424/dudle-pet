import type { FeeStatisticView } from "@/domain/facility";

// Do not infer a sample size from the number of published aggregate rows.
// N >= 2 only excludes single-observation summaries; it is not a confidence guarantee.
export const MIN_COMPARISON_SAMPLE = 2;
export function feeEvidence(row: FeeStatisticView) {
  if (row.sampleCount === null) return { eligible: false, reason: "표본 수 미공개 · 비교 보류" };
  if (row.sampleCount < MIN_COMPARISON_SAMPLE) return { eligible: false, reason: "표본 부족 · 비교 보류" };
  if (![row.minimumPrice,row.averagePrice,row.medianPrice,row.maximumPrice].some(v=>v!==null&&Number.isFinite(v)&&v>=0)) return { eligible:false,reason:"공개 가격 없음" };
  return { eligible: true, reason: `공식 표본 ${row.sampleCount}건` };
}
export function compareFees(rows: readonly FeeStatisticView[], focus: FeeStatisticView) {
  // Missing classification is not a comparable condition.
  if (!focus.animalType || !focus.weightClass) return [];
  return rows.filter(r => r.itemCode===focus.itemCode && r.surveyYear===focus.surveyYear
    && r.animalType===focus.animalType && r.weightClass===focus.weightClass
    && (r.regionLevel==='NATIONAL' || (r.regionLevel==='PROVINCE' && r.surveyProvinceName===focus.surveyProvinceName)
      || (r.regionLevel===focus.regionLevel && r.regionSlug===focus.regionSlug)))
    .map(row=>({row,...feeEvidence(row)}));
}
