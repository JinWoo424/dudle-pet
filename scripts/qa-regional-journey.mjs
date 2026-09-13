import { JSDOM } from "jsdom";
import { mkdir, writeFile } from "node:fs/promises";

// Local built server only: uses real DB reads but no external ad requests or writes.
const base=process.env.JOURNEY_QA_BASE??"http://localhost:3108";
if(!["localhost","127.0.0.1"].includes(new URL(base).hostname))throw new Error("Local QA target required");
const origin="https://pet.dudle.co.kr";
const paths=["/",...['hospital','pharmacy','funeral','cost'].flatMap(kind=>['busan','seoul','jeonnam-gwangju/yeosu'].map(region=>`/${kind}/${region}`))];
const pages=[];const targets=new Set();const errors=[];
const text=(node)=>node?.textContent?.replace(/\s+/g,' ').trim()??"";
async function get(path){
 try{
  let response=await fetch(base+path,{redirect:"manual",signal:AbortSignal.timeout(30000)});
  const status=response.status;let redirect=null;
  if(status>=300&&status<400){
   const next=new URL(response.headers.get('location'),base);
   if(![new URL(base).origin,origin].includes(next.origin))return {path,status,error:"external-redirect"};
   redirect=next.pathname+next.search;
   response=await fetch(base+redirect,{redirect:"manual",signal:AbortSignal.timeout(30000)});
  }
  return {path,status,finalStatus:response.status,redirect,html:await response.text()};
 }catch{return {path,status:0,error:"request-failed"};}
}
for(let index=0;index<paths.length;index++){
 const path=paths[index];const r=await get(path);
 if(r.finalStatus!==200){errors.push({path,status:r.finalStatus??r.status});continue;}
 const dom=new JSDOM(r.html);const doc=dom.window.document;
 const related=[...doc.querySelectorAll('.regional-journey a[href]')].map(a=>({path:a.getAttribute('href'),label:text(a)}));
 const title=text(doc.querySelector('title'));const description=doc.querySelector('meta[name="description"]')?.content??"";
 const canonical=doc.querySelector('link[rel="canonical"]')?.href??"";
 const robots=doc.querySelector('meta[name="robots"]')?.content??"";
 const schema=[...doc.querySelectorAll('script[type="application/ld+json"]')];
 let invalidJson=0;for(const s of schema){try{JSON.parse(s.textContent);}catch{invalidJson++;}}
 if(new Set(related.map(l=>l.path)).size!==related.length)errors.push({path,error:"duplicate-related-url"});
 if(new Set(related.map(l=>l.label)).size!==related.length)errors.push({path,error:"duplicate-related-label"});
 if(!canonical.startsWith(origin+'/'))errors.push({path,error:"canonical-origin"});
 if(!title||!description||doc.querySelectorAll('h1').length!==1||invalidJson)errors.push({path,error:"metadata-or-schema"});
 for(const a of doc.querySelectorAll('main a[href]')){
  const u=new URL(a.getAttribute('href'),base+path);
  if([new URL(base).origin,origin].includes(u.origin)&&!u.search&&!u.hash&&!/^\/(api|admin|report)(\/|$)/.test(u.pathname))targets.add(u.pathname);
 }
 if(index<13&&/^\/hospital\//.test(path)){
  const detail=[...doc.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).find(href=>/^\/hospital\/.*\/[0-9a-f-]{36}$/.test(href));
  if(detail&&!paths.includes(detail))paths.push(detail);
 }
 pages.push({path,status:r.status,canonical,robots,title,description,h1:text(doc.querySelector('h1')),jsonLd: schema.length,related});
 dom.window.close();
}
const checks=[];const queue=[...targets];let done=0;
async function worker(){while(queue.length){const path=queue.shift();const r=await get(path);checks.push({path,status:r.status,finalStatus:r.finalStatus,redirect:r.redirect});if(r.finalStatus!==200)errors.push({path,status:r.finalStatus??r.status,error:r.error??"linked-page-failed"});if(++done%100===0)console.log(JSON.stringify({checked:done,total:targets.size}));}}
await Promise.all([worker(),worker()]);
const duplicates=key=>{const map=new Map();for(const p of pages){const list=map.get(p[key])??[];list.push(p.path);map.set(p[key],list);}return [...map].filter(([,v])=>v.length>1).map(([value,paths])=>({value,paths}));};
const report={generatedAt:new Date().toISOString(),scope:"Local production build / real DB. Representative landing HTML and every unique unfiltered main-content link from those pages (one hop). Not all live production URLs.",pages:pages.length,linkedTargets:checks.length,errors,duplicateTitles:duplicates('title'),duplicateDescriptions:duplicates('description'),duplicateH1:duplicates('h1'),html:pages,links:checks};
await mkdir('docs/reports',{recursive:true});await writeFile('docs/reports/regional-journey-http.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,html:undefined,links:undefined}));
if(errors.length)process.exitCode=1;
