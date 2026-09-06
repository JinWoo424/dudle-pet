import '../env';
import { closeSql,getSql } from '../../src/db/connection';
async function main(){
 const sql=getSql();
 const [batch]=await sql`SELECT survey_year,row_count,success_count,failed_count,review_count,request_count,status FROM fee_import_batches WHERE status='SUCCESS' ORDER BY survey_year DESC,imported_at DESC LIMIT 1`;
 const scope=await sql`SELECT region_level,count(*)::int rows,count(DISTINCT coalesce(survey_region_code,'NATIONAL'))::int regions FROM medical_fee_statistics WHERE import_batch_id=(SELECT id FROM fee_import_batches WHERE status='SUCCESS' ORDER BY survey_year DESC,imported_at DESC LIMIT 1) GROUP BY region_level ORDER BY region_level`;
 const targets=await sql`SELECT coalesce(survey_city_name,survey_province_name,'전국') region,count(*)::int rows,count(DISTINCT item_code)::int items FROM medical_fee_statistics WHERE import_batch_id=(SELECT id FROM fee_import_batches WHERE status='SUCCESS' ORDER BY survey_year DESC,imported_at DESC LIMIT 1) AND coalesce(survey_city_name,survey_province_name,'전국')=ANY(${['서울특별시','부산광역시','여수시']}) GROUP BY 1 ORDER BY 1`;
 const [seo]=await sql`SELECT count(*) FILTER(WHERE seo_status='SEO_READY')::int ready,count(*) FILTER(WHERE seo_status='NOINDEX_LOW_DATA')::int noindex FROM seo_pages WHERE page_type IN ('COST_REGION','COST_ITEM')`;
 const required=await sql`SELECT canonical_url,seo_status FROM seo_pages WHERE canonical_url=ANY(${['https://pet.dudle.co.kr/cost/gyeonggi/suwon','https://pet.dudle.co.kr/cost/gyeonggi/suwon/xray','https://pet.dudle.co.kr/cost/busan','https://pet.dudle.co.kr/cost/jeonnam-gwangju/yeosu']}) ORDER BY canonical_url`;
 console.log(JSON.stringify({batch,scope,targets,seo,sitemapCostUrls:seo.ready,required}));
}
main().catch(()=>{console.error('FEE_REPORT_FAILED');process.exitCode=1;}).finally(closeSql);
