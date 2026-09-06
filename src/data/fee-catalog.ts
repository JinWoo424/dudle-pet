export type FeeAnimalType="DOG"|"CAT"|"ALL"|"NOT_APPLICABLE";
export type FeeWeightClass="KG_5"|"KG_10"|"KG_20"|"NOT_APPLICABLE";

export interface OfficialFeeItem {
  categoryCode:string;
  itemCode:string;
  itemName:string;
  dimensions:readonly {animalType:FeeAnimalType;weightClass:FeeWeightClass}[];
}

const weights=["KG_5","KG_10","KG_20"] as const;
const weighted=weights.map(weightClass=>({animalType:"NOT_APPLICABLE" as const,weightClass}));
const plain=[{animalType:"NOT_APPLICABLE" as const,weightClass:"NOT_APPLICABLE" as const}];

// Names and selectable conditions follow the 2025 official public screen. The
// codes are Dudle Pet's stable internal identifiers, not claimed source codes.
export const officialFeeItems:readonly OfficialFeeItem[]=[
 {categoryCode:"CONSULTATION",itemCode:"initial-consultation",itemName:"초진 진찰료",dimensions:weighted},
 {categoryCode:"CONSULTATION",itemCode:"followup-consultation",itemName:"재진 진찰료",dimensions:weighted},
 {categoryCode:"CONSULTATION",itemCode:"consultation-counseling",itemName:"진찰에 대한 상담료",dimensions:plain},
 {categoryCode:"HOSPITALIZATION",itemCode:"hospitalization",itemName:"입원비",dimensions:[...weights.map(weightClass=>({animalType:"DOG" as const,weightClass})),{animalType:"CAT",weightClass:"NOT_APPLICABLE"}]},
 {categoryCode:"VACCINATION",itemCode:"dog-combination-vaccine",itemName:"개 종합백신 접종비",dimensions:[{animalType:"DOG",weightClass:"NOT_APPLICABLE"}]},
 {categoryCode:"VACCINATION",itemCode:"cat-combination-vaccine",itemName:"고양이 종합백신 접종비",dimensions:[{animalType:"CAT",weightClass:"NOT_APPLICABLE"}]},
 {categoryCode:"VACCINATION",itemCode:"rabies-vaccine",itemName:"광견병백신 접종비",dimensions:plain},
 {categoryCode:"VACCINATION",itemCode:"kennel-cough-vaccine",itemName:"켄넬코프백신 접종비",dimensions:plain},
 {categoryCode:"VACCINATION",itemCode:"canine-coronavirus-vaccine",itemName:"개 코로나바이러스백신 접종비",dimensions:[{animalType:"DOG",weightClass:"NOT_APPLICABLE"}]},
 {categoryCode:"VACCINATION",itemCode:"influenza-vaccine",itemName:"인플루엔자백신 접종비",dimensions:plain},
 {categoryCode:"BLOOD_TEST",itemCode:"cbc",itemName:"전혈구 검사비와 판독료",dimensions:plain},
 {categoryCode:"BLOOD_TEST",itemCode:"blood-chemistry",itemName:"혈액화학 검사비와 판독료",dimensions:plain},
 {categoryCode:"BLOOD_TEST",itemCode:"electrolyte",itemName:"전해질 검사비와 판독료",dimensions:plain},
 {categoryCode:"IMAGING",itemCode:"xray",itemName:"엑스선 촬영비와 판독료",dimensions:weighted},
 {categoryCode:"IMAGING",itemCode:"ultrasound",itemName:"초음파 검사비와 판독료",dimensions:weighted},
 {categoryCode:"IMAGING",itemCode:"ct",itemName:"컴퓨터단층촬영검사(CT)비와 판독료",dimensions:weighted},
 {categoryCode:"IMAGING",itemCode:"mri",itemName:"자기공명영상검사(MRI)비와 판독료",dimensions:weighted},
 {categoryCode:"MEDICATION",itemCode:"heartworm-prevention",itemName:"심장사상충 예방비",dimensions:[{animalType:"NOT_APPLICABLE",weightClass:"KG_5"}]},
 {categoryCode:"MEDICATION",itemCode:"ectoparasite-prevention",itemName:"외부기생충 예방비",dimensions:[{animalType:"NOT_APPLICABLE",weightClass:"KG_5"}]},
 {categoryCode:"MEDICATION",itemCode:"broad-spectrum-deworming",itemName:"광범위 구충비",dimensions:[{animalType:"NOT_APPLICABLE",weightClass:"KG_5"}]},
] as const;

export const officialFeeItemByCode=new Map(officialFeeItems.map(item=>[item.itemCode,item]));
export const feeCategoryLabels:Record<string,string>={CONSULTATION:"진찰",HOSPITALIZATION:"입원",VACCINATION:"예방접종",BLOOD_TEST:"혈액검사",IMAGING:"영상검사",MEDICATION:"투약/조제"};

export function isOfficialFeeDimension(item:OfficialFeeItem,animalType:FeeAnimalType,weightClass:FeeWeightClass){
 return item.dimensions.some(d=>d.animalType===animalType&&d.weightClass===weightClass);
}
