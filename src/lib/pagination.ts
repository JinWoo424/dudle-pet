export function paginationPages(current:number,totalItems:number,pageSize:number,maxLinks=9){
 const total=Math.max(1,Math.ceil(totalItems/pageSize));
 if(total<=maxLinks)return Array.from({length:total},(_,index)=>index+1);
 const pages=new Set([1,total,current-2,current-1,current,current+1,current+2]);
 const remaining=Math.max(0,maxLinks-pages.size);
 for(let index=1;index<=remaining;index++)pages.add(Math.round(1+(index*(total-1))/(remaining+1)));
 return [...pages].filter(page=>page>=1&&page<=total).sort((a,b)=>a-b).slice(0,maxLinks);
}
