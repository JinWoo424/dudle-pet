export function RouteLoading({label="정보"}:{label?:string}){
 return <div className="shell route-loading" role="status" aria-live="polite" aria-label={`${label} 불러오는 중`}>
  <div className="route-loading-heading" />
  <div className="route-loading-summary" />
  <div className="route-loading-grid" aria-hidden="true">
   {Array.from({length:3},(_,index)=><div className="route-loading-card" key={index}><span/><span/><span/></div>)}
  </div>
  <span className="sr-only">{label}를 불러오고 있습니다.</span>
 </div>;
}
