import './env.ts';
import {getSql,closeSql} from '../src/db/connection.ts';
import {queryFacilities} from '../src/data/repository.ts';
import {writeFileSync} from 'node:fs';

const sql=getSql(), results=[];
// Applies only to this short-lived diagnostic process, never Vercel or DB settings.
sql.options.connection.statement_timeout='3000';
sql.options.connection.default_transaction_read_only='on';
const url=new URL(process.env.DATABASE_URL);
const report={at:new Date().toISOString(),source:'Actual queryFacilities SQL, captured in memory; parameters never persisted',connection:{transactionPooler:url.port==='6543',max:sql.options.max,prepare:sql.options.prepare,strictTls:sql.options.ssl.rejectUnauthorized},results};
try{
 for(const type of ['ANIMAL_HOSPITAL','ANIMAL_PHARMACY'])for(const regionSlug of ['seoul','busan','jeonnam-gwangju/yeosu']){
  const captured=[];
  sql.options.debug=(_connection,text,parameters)=>{if(text.trimStart().startsWith('SELECT'))captured.push({text,parameters:[...parameters],started:performance.now()});};
  const start=performance.now(),data=await queryFacilities({type,regionSlug}),finished=performance.now();
  sql.options.debug=false;
  const queries=[];
  for(const [i,q] of captured.entries()){
   const plan=await sql.begin('read only',async tx=>{
    await tx`SET LOCAL statement_timeout='3000'`;
    return tx.unsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${q.text}`,q.parameters);
   });
   queries.push({stage:i===0?'aggregate':'page-rows',clientMs:Math.round((captured[i+1]?.started??finished)-q.started),sql:q.text,plan:plan[0]['QUERY PLAN']});
  }
  const row={type,regionSlug,total:data.total,returnedRows:data.facilities.length,clientTotalMs:Math.round(finished-start),queries};results.push(row);
  writeFileSync('docs/reports/directory-sql.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({type,regionSlug,total:data.total,returnedRows:data.facilities.length,clientTotalMs:row.clientTotalMs,executionMs:queries.map(q=>q.plan[0]['Execution Time'])}));
 }
}catch(error){console.log(JSON.stringify({errorType:error.name,code:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:undefined}));process.exitCode=1;}
finally{sql.options.debug=false;await closeSql();}
