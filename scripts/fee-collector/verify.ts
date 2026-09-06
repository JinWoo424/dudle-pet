import '../env';
import { readFile } from 'node:fs/promises';
import { closeSql, getSql } from '../../src/db/connection';
import { parsePrices, query } from './source.mjs';
type Crosswalk={scope:string;code:string;province:string|null;city:string|null;currentRegionSlug:string|null;method:string};
const required=['서울특별시','부산광역시','대구광역시','인천광역시','대전광역시','울산광역시','세종특별자치시','제주특별자치도','수원시','춘천시','청주시','천안시','전주시','포항시','창원시','여수시','순천시'];
async function main(){
 const sql=getSql();
 const [batch]=await sql`SELECT id,survey_year,row_count,success_count,failed_count,review_count,request_count,status FROM fee_import_batches WHERE survey_year=2025 AND status='SUCCESS' ORDER BY imported_at DESC LIMIT 1`;
 if(!batch)throw new Error('SUCCESS_BATCH_NOT_FOUND');
 const [integrity]=await sql`SELECT count(*)::int rows,count(*) FILTER(WHERE current_region_id IS NOT NULL)::int matched,
  count(*) FILTER(WHERE current_region_id IS NULL AND region_level<>'NATIONAL')::int historical_only,
  count(*) FILTER(WHERE minimum_price>maximum_price OR median_price NOT BETWEEN minimum_price AND maximum_price OR average_price NOT BETWEEN minimum_price AND maximum_price)::int price_errors,
  count(*) FILTER(WHERE sample_count IS NOT NULL)::int sample_counts FROM medical_fee_statistics WHERE import_batch_id=${batch.id}`;
 const coverage=await sql`SELECT coalesce(m.survey_city_name,m.survey_province_name,'전국') name,count(*)::int rows FROM medical_fee_statistics m WHERE import_batch_id=${batch.id} AND coalesce(m.survey_city_name,m.survey_province_name,'전국')=ANY(${required}) GROUP BY 1 ORDER BY 1`;
 const crosswalk:Crosswalk[]=JSON.parse(await readFile('data/cache/fees-2025/crosswalk.json','utf8'));
 const normalized=JSON.parse(await readFile('data/cache/fees-2025/normalized.json','utf8'));
 const candidates=normalized.rows.filter((r:{regionLevel:string;surveyProvinceName:string;surveyCityName:string;itemCode:string})=>r.regionLevel==='CITY'&&['서울특별시','부산광역시','전라남도'].includes(r.surveyProvinceName)&&['initial-consultation','dog-combination-vaccine','cbc','xray','ultrasound','ct','mri'].includes(r.itemCode));
 const samples=[...candidates.filter((_:unknown,i:number)=>i%Math.max(1,Math.floor(candidates.length/20))===0).slice(0,20)];
 let passed=0;
 for(const expected of samples){
  const weights:Record<string,string>={KG_5:'ANITY00006',KG_10:'ANITY00007',KG_20:'ANITY00008'};
  const condition=expected.itemCode==='dog-combination-vaccine'?{code:'MEDIT00005',condition:'ANITY00001'}:
   ({'initial-consultation':['MEDIT00001',weights[expected.weightClass]],cbc:['MEDIT00010',''],xray:['MEDIT00011',weights[expected.weightClass]],ultrasound:['MEDIT00015',weights[expected.weightClass]],ct:['MEDIT00016',weights[expected.weightClass]],mri:['MEDIT00017',weights[expected.weightClass]]} as Record<string,[string,string]>)[expected.itemCode];
  const [code,animal]=Array.isArray(condition)?condition:[condition.code,condition.condition];
  const province=crosswalk.find(x=>x.scope==='CITY'&&x.province===expected.surveyProvinceName&&x.city===expected.surveyCityName)?.code.slice(0,2);
  const live=(await query('searchPrice',{sidoCd:province!,mediTypeCd:code,animalTypeCd:animal},{scope:'QA'},true)).data.find((r:Record<string,unknown>)=>r.ADDR2_NM===expected.surveyCityName);
  if(!live)throw new Error('LIVE_SAMPLE_MISSING');
  const p=parsePrices(live);
  const [stored]=await sql`SELECT minimum_price,median_price,average_price,maximum_price FROM medical_fee_statistics WHERE import_batch_id=${batch.id} AND region_level='CITY' AND survey_province_name=${expected.surveyProvinceName} AND survey_city_name=${expected.surveyCityName} AND item_code=${expected.itemCode} AND animal_type::text=${expected.animalType} AND weight_class::text=${expected.weightClass}`;
  const db={minimum:stored?.minimum_price==null?null:Number(stored.minimum_price),median:stored?.median_price==null?null:Number(stored.median_price),average:stored?.average_price==null?null:Number(stored.average_price),maximum:stored?.maximum_price==null?null:Number(stored.maximum_price)};
  if(!stored||JSON.stringify(db)!==JSON.stringify(p)){
   console.error(JSON.stringify({region:`${expected.surveyProvinceName} ${expected.surveyCityName}`,item:expected.itemCode,animal:expected.animalType,weight:expected.weightClass,live:p,stored:stored?db:null}));
   throw new Error('LIVE_DB_SAMPLE_MISMATCH');
  }
  passed++;
 }
 console.log(JSON.stringify({batch:{...batch,id:'REDACTED'},integrity,coverage,requiredCoverage:required.length,liveSamples:{passed,total:samples.length}}));
}
main().catch(e=>{console.error(/^[A-Z_]+$/.test(e.message)?e.message:'FEE_VERIFICATION_FAILED');process.exitCode=1;}).finally(closeSql);
