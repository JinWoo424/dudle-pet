import {readFileSync,writeFileSync,appendFileSync,existsSync,mkdirSync} from 'node:fs';
// Full rendered HTML graph, not a synthetic sitemap-as-links graph.
// Keep request rate conservative: one worker, resumable deployment-specific cache.
const base=new URL(process.env.GRAPH_BASE||'http://localhost:3108');
if(!['localhost','127.0.0.1'].includes(base.hostname))throw new Error('LOCAL_ONLY: use a local production-policy build for index graph');
const seeds=JSON.parse(readFileSync('.local-secrets/phase2-graph-seeds.json','utf8'));
const cache='.local-secrets/phase2-html-graph.ndjson';
const nodes=new Map(existsSync(cache)?readFileSync(cache,'utf8').trim().split('\n').filter(Boolean).map(s=>{const v=JSON.parse(s);return[v.path,v]}):[]);
const queue=[...new Set(['/',...seeds,...[...nodes.values()].flatMap(v=>v.links)])],queued=new Set(queue);
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&#x27;',"'").replaceAll('&quot;','"');
function links(html){return [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/gi)].flatMap(m=>{try{const u=new URL(decode(m[1]),base);if(![base.origin,'https://pet.dudle.co.kr'].includes(u.origin)||/^\/(api|admin|report|search|nearby)(\/|$)/.test(u.pathname))return[];if(u.search&&(!/^\?page=[1-9]\d*$/.test(u.search)))return[];return[u.pathname+u.search]}catch{return[]}});}
let done=0;
for(let i=0;i<queue.length;i++){
 const path=queue[i];if(nodes.has(path))continue;
 try{
  const start=performance.now(),r=await fetch(new URL(path,base),{redirect:'manual',signal:AbortSignal.timeout(30000)}),html=await r.text();
  const canonical=decode(html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1]??'');
  const robots=html.match(/<meta[^>]*name="robots"[^>]*content="([^"]*)"/i)?.[1]??'';
  const hrefs=r.status===200?[...new Set(links(html))]:[];
  const node={path,status:r.status,canonical,robots,xRobots:r.headers.get('x-robots-tag'),links:hrefs,ms:Math.round(performance.now()-start),h1:(html.match(/<h1\b/gi)||[]).length};
  nodes.set(path,node);appendFileSync(cache,JSON.stringify(node)+'\n');
  for(const target of hrefs)if(!queued.has(target)){queued.add(target);queue.push(target);}
  if(r.status>=500){console.log('PAUSED_ON_SERVER_ERROR');break;}
 }catch{console.log('PAUSED_ON_REQUEST_FAILURE');break;}
 if(++done%100===0)console.log(JSON.stringify({crawled:nodes.size,queued:queue.length}));
}
const complete=queue.every(p=>nodes.has(p));
const indexable=[...nodes.values()].filter(n=>n.status===200&&!/noindex/i.test(n.robots+' '+n.xRobots)&&n.canonical===new URL(n.path,'https://pet.dudle.co.kr').href);
const inbound=new Map(indexable.map(n=>[n.path,new Set()]));
for(const n of nodes.values())if(n.status===200&&!/nofollow/i.test(n.robots+' '+n.xRobots))for(const link of n.links)if(link!==n.path)inbound.get(link)?.add(n.path);
const depths=new Map([['/',0]]),todo=['/'];
for(let i=0;i<todo.length;i++){const n=nodes.get(todo[i]);if(!n||n.status!==200||/nofollow/i.test(n.robots+' '+n.xRobots))continue;for(const link of n.links)if(!depths.has(link)){depths.set(link,depths.get(n.path)+1);todo.push(link);}}
const distribution={hospital:0,pharmacy:0,funeral:0,cost:0,region:0,guide:0,other:0};
for(const n of nodes.values())for(const link of n.links){const key=link.split('/')[1];distribution[key in distribution?key:'other']++;}
const buckets={zero:0,one:0,twoToFive:0,sixPlus:0},depthBuckets={zeroToTwo:0,three:0,four:0,fivePlus:0,unreachable:0};
for(const n of indexable){const count=inbound.get(n.path).size;buckets[count===0?'zero':count===1?'one':count<=5?'twoToFive':'sixPlus']++;const d=depths.get(n.path);depthBuckets[d===undefined?'unreachable':d<=2?'zeroToTwo':d===3?'three':d===4?'four':'fivePlus']++;}
const report={at:new Date().toISOString(),scope:'LOCAL_RENDERED_PRODUCTION_POLICY',complete,crawled:nodes.size,queued:queue.length,indexable:indexable.length,inbound:buckets,depth:depthBuckets,distribution,orphans:complete?indexable.filter(n=>n.path!=='/'&&!inbound.get(n.path).size).map(n=>n.path):null,deepLandings:indexable.filter(n=>!/[a-f0-9]{8}-/.test(n.path)&&(depths.get(n.path)??Infinity)>=4).map(n=>({path:n.path,depth:depths.get(n.path)??null})),httpErrors:[...nodes.values()].filter(n=>n.status>=400).map(n=>({path:n.path,status:n.status})),sitemapConflicts:seeds.filter(p=>nodes.has(p)&&!indexable.some(n=>n.path===p)),missingFromSeed:indexable.filter(n=>!seeds.includes(n.path)).map(n=>n.path)};
mkdirSync('docs/reports',{recursive:true});writeFileSync('docs/reports/phase2-html-graph.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,orphans:report.orphans?.length,deepLandings:report.deepLandings.length,httpErrors:report.httpErrors.length,sitemapConflicts:report.sitemapConflicts.length,missingFromSeed:report.missingFromSeed.length}));
if(!complete)process.exitCode=1;
