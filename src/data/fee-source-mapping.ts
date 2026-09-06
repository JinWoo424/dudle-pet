import { officialFeeItemByCode, type FeeAnimalType, type FeeWeightClass } from './fee-catalog';

// Observed on the public radio controls, not inferred from numeric sequences.
const codes: Record<string, string> = {
 MEDIT00001:'initial-consultation', MEDIT00002:'followup-consultation', MEDIT00003:'consultation-counseling',
 MEDIT00004:'hospitalization', MEDIT00007:'rabies-vaccine', MEDIT00008:'kennel-cough-vaccine',
 MEDIT00009:'influenza-vaccine', MEDIT00010:'cbc', MEDIT00011:'xray', MEDIT00012:'canine-coronavirus-vaccine',
 MEDIT00013:'blood-chemistry', MEDIT00014:'electrolyte', MEDIT00015:'ultrasound', MEDIT00016:'ct',
 MEDIT00017:'mri', MEDIT00018:'heartworm-prevention', MEDIT00019:'ectoparasite-prevention', MEDIT00020:'broad-spectrum-deworming',
};
export function mapFeeCondition(code:string, condition:string) {
 const itemCode=code==='MEDIT00005' ? (condition==='ANITY00001'?'dog-combination-vaccine':condition==='ANITY00005'?'cat-combination-vaccine':'') : codes[code];
 const item=officialFeeItemByCode.get(itemCode);
 if(!item)throw new Error('UNKNOWN_SOURCE_ITEM');
 const weights:Record<string,FeeWeightClass>={ANITY00006:'KG_5',ANITY00007:'KG_10',ANITY00008:'KG_20'};
 const animalType:FeeAnimalType=condition==='ANITY00005'?'CAT':condition==='ANITY00001'||code==='MEDIT00012'||(code==='MEDIT00004'&&condition in weights)?'DOG':'NOT_APPLICABLE';
 const weightClass:FeeWeightClass=weights[condition]??(item.categoryCode==='MEDICATION'?'KG_5':'NOT_APPLICABLE');
 if(!item.dimensions.some(d=>d.animalType===animalType&&d.weightClass===weightClass))throw new Error('UNKNOWN_SOURCE_DIMENSION');
 if(condition&&!['ANITY00001','ANITY00005',...Object.keys(weights)].includes(condition))throw new Error('UNKNOWN_SOURCE_CONDITION');
 return { itemCode:item.itemCode,itemName:item.itemName,categoryCode:item.categoryCode,animalType,weightClass };
}

export type FeeCurrentRegion={id:number;parent_id:number|null;level:string;name:string;full_slug:string;official_code:string|null};
// Established current region_aliases links these old parent names to the merged
// parent. Used ONLY for exact city-name matching; never for province statistics.
const historicalParents:Record<string,string>={'전라남도':'전남광주통합특별시','광주광역시':'전남광주통합특별시'};
export function crosswalkFeeRegion(scope:string,province:string|null,city:string|null,sourceCode:string,regions:FeeCurrentRegion[]) {
 if(scope==='NATIONAL')return {currentRegionSlug:null,method:'NOT_APPLICABLE'};
 if(scope==='PROVINCE'&&province&&historicalParents[province])return {currentRegionSlug:null,method:'HISTORICAL_ONLY'};
 const parentName=province?(historicalParents[province]??province):null;
 const parent=regions.find(r=>r.level==='PROVINCE'&&r.name===parentName);
 if(!parent)return {currentRegionSlug:null,method:'REVIEW_REQUIRED'};
 if(scope==='PROVINCE')return {currentRegionSlug:parent.full_slug,method:parent.official_code?.startsWith(sourceCode)?'CODE_AND_NAME':'EXACT_PARENT_NAME'};
 // Former Incheon districts were split/merged in 2026. Equal names do not
 // establish unchanged boundaries. Preserve all non-code-identical rows.
 const candidates=regions.filter(r=>r.level==='CITY'&&r.parent_id===parent.id&&r.name===city);
 const exact=candidates.find(r=>r.official_code?.slice(0,5)===sourceCode);
 if(exact)return {currentRegionSlug:exact.full_slug,method:'CODE_AND_NAME'};
 if(province==='인천광역시')return {currentRegionSlug:null,method:'REVIEW_REQUIRED'};
 if(candidates.length!==1)return {currentRegionSlug:null,method:'REVIEW_REQUIRED'};
 return {currentRegionSlug:candidates[0].full_slug,method:province&&historicalParents[province]?'HISTORICAL_PARENT_EXACT_CITY':'EXACT_CITY_VERIFIED_PARENT'};
}
