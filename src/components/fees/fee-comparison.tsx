import type { FeeStatisticView } from "@/domain/facility";
import { compareFees } from "@/lib/fee-comparison";
import { formatWon } from "@/lib/format";
const animals:Record<string,string>={DOG:"개",CAT:"고양이",ALL:"전체",NOT_APPLICABLE:"구분 없음"};
const weights:Record<string,string>={KG_5:"5kg",KG_10:"10kg",KG_20:"20kg",NOT_APPLICABLE:"구분 없음"};

export function FeeComparison({rows,focus}:{rows:readonly FeeStatisticView[];focus:FeeStatisticView}) {
 const comparisons=compareFees(rows,focus);
 if(!comparisons.length)return null;
 return <section className="card content-panel" data-analytics-placement="content" data-fee-item={focus.itemCode}>
  <h2>같은 조건으로 지역 통계 비교</h2>
  <p>{focus.surveyYear}년 · {focus.itemName} · {animals[focus.animalType??""]??"동물 구분 미확인"} · {weights[focus.weightClass??""]??"체중 미확인"}</p>
  <p className="quality-note">조사 당시 지역 기준입니다. 현재 통합 광역단체 통계로 재합산하지 않습니다. 표본 미공개·2건 미만은 비교 수치를 표시하지 않습니다.</p>
  <details data-analytics-event="fee_compare"><summary>지역·광역·전국 비교 펼치기</summary>
   <div className="fee-comparison-grid">{comparisons.map(({row,eligible,reason})=><article className="card content-panel" key={`${row.regionLevel}-${row.surveyRegionCode??row.region}`}>
    <h3>{row.regionLevel==='NATIONAL'?"전국":row.regionLevel==='PROVINCE'?row.surveyProvinceName:row.surveyCityName??row.region}</h3><p>{reason}</p>
    {eligible?<dl><dt>평균</dt><dd>{formatWon(row.averagePrice)}</dd><dt>중앙값</dt><dd>{formatWon(row.medianPrice)}</dd><dt>최저 / 최고</dt><dd>{formatWon(row.minimumPrice)} / {formatWon(row.maximumPrice)}</dd></dl>:<p>통계 신뢰도를 확인할 수 없어 가격 비교를 보류합니다. 원본 공개값은 아래 표에서 별도로 확인할 수 있습니다.</p>}
   </article>)}</div>
  </details>
 </section>;
}
