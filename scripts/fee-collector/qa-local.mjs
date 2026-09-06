const base=process.env.FEE_QA_URL??'http://localhost:3100';
const paths=['/cost','/cost/seoul','/cost/busan','/cost/daegu','/cost/incheon','/cost/daejeon','/cost/ulsan','/cost/sejong','/cost/jeju',
 '/cost/gyeonggi/suwon','/cost/gangwon/chuncheon','/cost/chungbuk/cheongju','/cost/chungnam/cheonan','/cost/jeonbuk/jeonju','/cost/gyeongbuk/pohang','/cost/gyeongnam/changwon','/cost/jeonnam-gwangju/yeosu','/cost/jeonnam-gwangju/suncheon',
 '/cost/busan/xray','/cost/busan/mri','/cost/seoul/ct','/cost/jeonnam-gwangju/yeosu/xray'];
let failures=0;
for(const path of paths){
 const response=await fetch(base+path);const html=await response.text();
 const result={path,status:response.status,title:html.match(/<title>(.*?)<\/title>/)?.[1],canonical:html.match(/rel="canonical" href="([^"]+)/)?.[1],robots:html.match(/name="robots" content="([^"]+)/)?.[1],official:html.includes('농림축산식품부'),hasPrice:/[0-9,]+원/.test(html),error:/Application error|Database is not configured|SELF_SIGNED/i.test(html)};
 if(response.status!==200||!result.official||!result.hasPrice||result.error)failures++;
 console.log(JSON.stringify(result));
}
if(failures)process.exitCode=1;
