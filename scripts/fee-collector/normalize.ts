import '../env';
import { readFile, writeFile } from 'node:fs/promises';
import { closeSql, getSql } from '../../src/db/connection';
import { crosswalkFeeRegion, mapFeeCondition, type FeeCurrentRegion } from '../../src/data/fee-source-mapping';
import { previewFeeImport, importFeeFile } from '../../src/data/fee-import';
type Raw={scope:string;source:{SIDO_CD:string;ADDR2_NM?:string;ADDR1_NM?:string;MEDI_TYPE_CD?:string;ANIMAL_TYPE_CD?:string};condition:{code:string;condition:string};prices:{minimum:number|null;median:number|null;average:number|null;maximum:number|null};snapshot:string};
type Contract={provinces:{code:string;name:string;cities:{ADDR2_CD:string;ADDR2_NM:string}[]}[]};
async function main(){
 const path='data/cache/fees-2025';
 const raw: {surveyYear:number;rows:Raw[];errors:object[];counters:object;retrievedAt:string}=JSON.parse(await readFile(`${path}/national.json`,'utf8'));
 if(raw.errors.length)throw new Error('COLLECTOR_VALIDATION_FAILED');
 const contract:Contract=JSON.parse(await readFile('data/cache/fee-region-contract-2025.json','utf8'));
 const regions=await getSql()<FeeCurrentRegion[]>`SELECT id,parent_id,level,name,full_slug,official_code FROM regions WHERE is_active AND level IN ('PROVINCE','CITY')`;
 const crosswalk=new Map<string,{scope:string;code:string;province:string|null;city:string|null;currentRegionSlug:string|null;method:string}>();
 const rows=raw.rows.map(r=>{
  const province=contract.provinces.find(p=>p.code===r.source.SIDO_CD);
  if(r.scope!=='NATIONAL'&&!province)throw new Error('SOURCE_PROVINCE_UNKNOWN');
  if(r.scope==='CITY'&&r.source.ADDR1_NM!==province?.name)throw new Error('SOURCE_PARENT_MISMATCH');
  const city=province?.cities.find(c=>c.ADDR2_NM===r.source.ADDR2_NM);
  if(r.scope==='CITY'&&!city)throw new Error('SOURCE_CITY_UNKNOWN');
  const code=province?province.code+(city?.ADDR2_CD??''):'99';
  const mapping=crosswalkFeeRegion(r.scope,province?.name??null,city?.ADDR2_NM??null,code,regions);
  crosswalk.set(`${r.scope}|${code}`,{scope:r.scope,code,province:province?.name??null,city:city?.ADDR2_NM??null,...mapping});
  return {regionLevel:r.scope,surveyRegionCode:code,surveyProvinceName:province?.name??null,surveyCityName:city?.ADDR2_NM??null,...mapFeeCondition(r.condition.code,r.condition.condition),currentRegionSlug:mapping.currentRegionSlug,
   minimumPrice:r.prices.minimum,medianPrice:r.prices.median,averagePrice:r.prices.average,maximumPrice:r.prices.maximum,sampleCount:null};
 });
 const data={surveyYear:raw.surveyYear,sourceName:'농림축산식품부 동물병원 진료비용 현황 조사 및 공개',sourceUrl:'https://animalclinicfee.or.kr/info/payInfo.do',sourceDate:'2025-12-22',rows};
 const text=JSON.stringify(data);
 await writeFile(`${path}/normalized.json`,text);
 await writeFile(`${path}/crosswalk.json`,JSON.stringify([...crosswalk.values()],null,2));
 const preview=await previewFeeImport(text);
 const report={...preview,rows:undefined,crosswalk:[...crosswalk.values()]};
 await writeFile(`${path}/dry-run-report.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({...report,crosswalk:undefined}));
 if(process.argv.includes('--commit')){
  if(!preview.canImport&&preview.alreadyImported){console.log('ALREADY_IMPORTED_NO_WRITE');return;}
  if(!preview.canImport)throw new Error('IMPORT_GATE_FAILED');
  const reviewRegions=[...crosswalk.values()].filter(r=>r.method==='REVIEW_REQUIRED');
  const result=await importFeeFile(text,'official-public-ui-2025.json','fee-collector',{
   requestCount:630,reviewCount:rows.filter(r=>reviewRegions.some(x=>x.scope===r.regionLevel&&x.code===r.surveyRegionCode)).length,
   startedAt:raw.retrievedAt,notes:JSON.stringify({source:'public-ui-offline-snapshot',crosswalkReview:reviewRegions,collectionCounters:raw.counters})});
  console.log(JSON.stringify(result));
 }
}
main().catch(e=>{console.error(/^[A-Z_]+$/.test(e.message)?e.message:'FEE_NORMALIZATION_FAILED');process.exitCode=1;}).finally(closeSql);
