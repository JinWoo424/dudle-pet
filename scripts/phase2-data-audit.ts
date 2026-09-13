import './env';
import {getSql,closeSql} from '../src/db/connection';
import {writeFileSync,mkdirSync} from 'node:fs';
async function main(){
 const sql=getSql();
 const samples=await sql`SELECT survey_year,count(*)::int AS rows,count(*) FILTER(WHERE sample_count IS NULL)::int AS sample_unpublished,count(*) FILTER(WHERE sample_count<2)::int AS sample_below_two,count(*) FILTER(WHERE sample_count>=2)::int AS sample_comparable FROM medical_fee_statistics GROUP BY survey_year`;
 const indexes=await sql`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('seo_pages','medical_fee_statistics','regions')`;
 const urls=await sql`SELECT canonical_url FROM seo_pages WHERE seo_status='SEO_READY' AND NOT manual_hold ORDER BY canonical_url`;
 mkdirSync('.local-secrets',{recursive:true});mkdirSync('docs/reports',{recursive:true});
 writeFileSync('.local-secrets/phase2-graph-seeds.json',JSON.stringify(urls.map(r=>new URL(String(r.canonical_url)).pathname)));
 writeFileSync('docs/reports/phase2-data-audit.json',JSON.stringify({at:new Date().toISOString(),samples,indexes,approvedUrls:urls.length},null,2));
 console.log(JSON.stringify({samples,approvedUrls:urls.length}));
}
main().catch(()=>{console.error('DATA_AUDIT_FAILED');process.exitCode=1}).finally(closeSql);
