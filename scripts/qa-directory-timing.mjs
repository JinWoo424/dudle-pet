import {readFileSync,writeFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {JSDOM} from 'jsdom';

const base=new URL(process.env.PREVIEW_TIMING_URL||'https://dudle-747n71ple-jinwoo424.vercel.app');
if(base.protocol!=='https:'||!base.hostname.endsWith('.vercel.app')||base.username||base.password)throw Error('Preview only');
const env=parseEnv(readFileSync('.local-secrets/vercel-preview.env','utf8'));
const secret=env.VERCEL_AUTOMATION_BYPASS_SECRET;
if(!secret)throw Error('BYPASS_MISSING');
const paths=['hospital','pharmacy'].flatMap(type=>['seoul','busan','jeonnam-gwangju/yeosu'].map(region=>`/${type}/${region}`));
const results=[];
const report={at:new Date().toISOString(),origin:base.origin,timeoutMs:30000,concurrency:1,coldQualification:'First observed request after previous audit; platform cold start unproven',results};
const file=`docs/reports/directory-timing-${base.hostname}.json`;
for(const path of paths)for(let attempt=1;attempt<=5;attempt++){
 const row={path,attempt,startedAt:new Date().toISOString(),condition:attempt===1?'first-observed':'consecutive-warm',status:null,ttfbMs:null,totalMs:null,functionDurationMs:null,dbDurationMs:null,renderDurationMs:null};
 const start=performance.now();
 try{
  const response=await fetch(new URL(path,base),{headers:{'x-vercel-protection-bypass':secret},redirect:'manual',signal:AbortSignal.timeout(30000)});
  row.ttfbMs=Math.round(performance.now()-start);row.status=response.status;
  row.vercelRequestId=response.headers.get('x-vercel-id');row.cache=response.headers.get('x-vercel-cache');row.serverTiming=response.headers.get('server-timing');
  const html=await response.text();row.totalMs=Math.round(performance.now()-start);row.bytes=Buffer.byteLength(html);
  const dom=new JSDOM(html),d=dom.window.document;
  row.h1=d.querySelector('h1')?.textContent;row.canonical=d.querySelector('link[rel="canonical"]')?.href;
  row.og=!!d.querySelector('meta[property="og:title"]');row.robots=d.querySelector('meta[name="robots"]')?.content;row.xRobots=response.headers.get('x-robots-tag');
  row.jsonLdErrors=0;for(const s of d.querySelectorAll('script[type="application/ld+json"]'))try{JSON.parse(s.textContent)}catch{row.jsonLdErrors++;}
  row.relatedLinks=d.querySelectorAll('.regional-journey a').length;
  row.pass=row.status===200&&!!row.h1&&row.og&&row.canonical===`https://pet.dudle.co.kr${path}`&&row.jsonLdErrors===0;
  dom.window.close();
 }catch(error){row.totalMs=Math.round(performance.now()-start);row.errorType=error.name;row.timeout=error.name==='TimeoutError';row.pass=false;}
 results.push(row);writeFileSync(file,JSON.stringify(report,null,2));
 console.log(JSON.stringify({path,attempt,status:row.status,ttfbMs:row.ttfbMs,totalMs:row.totalMs,errorType:row.errorType,pass:row.pass}));
}
report.summary=paths.map(path=>{const rows=results.filter(r=>r.path===path),values=rows.filter(r=>r.pass).map(r=>r.totalMs).sort((a,b)=>a-b);return {path,success:values.length,attempts:rows.length,meanMs:values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null,medianMs:values.length?values[Math.floor(values.length/2)]:null};});
writeFileSync(file,JSON.stringify(report,null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
