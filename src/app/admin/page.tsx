import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getSql } from "@/db/connection";
import { adminConfigured, verifyAdminSession } from "@/lib/admin-auth";
import { FeeImportPanel } from "@/components/admin/fee-import-panel";
export const metadata:Metadata={title:"관리자",robots:{index:false,follow:false}};
export const runtime="nodejs";
export const dynamic="force-dynamic";
export default async function AdminPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 if(!adminConfigured())return <section className="shell admin-shell prose"><h1>관리자 설정이 필요합니다.</h1><p>관리자 이메일, scrypt 비밀번호 해시, 32자 이상의 세션 비밀값과 DB 연결을 환경변수에 설정하세요.</p></section>;
 if(!verifyAdminSession((await cookies()).get("dudle_admin")?.value))return <section className="shell admin-shell"><div className="form-card card"><h1>관리자 로그인</h1><form method="post" action="/api/admin/login"><div className="form-field"><label htmlFor="email">이메일</label><input id="email" name="email" type="email" required autoComplete="username"/></div><div className="form-field"><label htmlFor="password">비밀번호</label><input id="password" name="password" type="password" required autoComplete="current-password"/></div><button className="primary-button">로그인</button></form></div></section>;
 const query=await searchParams;const view=query.view??"facilities";const page=Math.max(1,Math.min(10000,Number(query.page)||1));const q=(query.q??"").slice(0,120);
 const reviewType=({HOSPITAL:"ANIMAL_HOSPITAL",PHARMACY:"ANIMAL_PHARMACY",FUNERAL:"PET_FUNERAL"} as Record<string,string>)[query.type??""]??"";
 const reviewCategory=["DUPLICATE","REGION","GEO","DATA_QUALITY"].includes(query.category??"")?query.category!:"";
 const sql=getSql();
 const counts=await sql`SELECT facility_type,business_status,count(*)::int AS count FROM facilities GROUP BY facility_type,business_status ORDER BY facility_type,business_status`;
 const sourceSummary=await sql`SELECT f.facility_type,count(*)::int AS total,
  count(*) FILTER(WHERE f.business_status='OPEN')::int AS open,
  count(*) FILTER(WHERE f.business_status='CLOSED')::int AS closed,
  count(*) FILTER(WHERE f.geo_status='MISSING')::int AS coordinate_missing,
  count(*) FILTER(WHERE f.region_status<>'MATCHED')::int AS region_error,
  (SELECT count(*)::int FROM facility_duplicate_reviews d WHERE d.decision='REVIEW_REQUIRED' AND d.source_type=CASE f.facility_type WHEN 'ANIMAL_HOSPITAL' THEN 'MOIS_ANIMAL_HOSPITAL' WHEN 'ANIMAL_PHARMACY' THEN 'MOIS_ANIMAL_PHARMACY' ELSE 'MOIS_PET_FUNERAL' END) AS review_required
  FROM facilities f WHERE f.facility_type IN ('ANIMAL_HOSPITAL','ANIMAL_PHARMACY','PET_FUNERAL') GROUP BY f.facility_type ORDER BY f.facility_type`;
 const [quality]=await sql`SELECT count(*) FILTER(WHERE geo_status<>'VALID')::int AS missing_geo,count(*) FILTER(WHERE phone_normalized IS NULL)::int AS missing_phone,count(*) FILTER(WHERE region_status<>'MATCHED')::int AS region_review FROM facilities`;
 const [health]=await sql`SELECT PostGIS_Version() AS postgis`;
 let rows:Record<string,unknown>[]=[];
 if(view==="facilities") rows=await sql`SELECT id,name,facility_type,business_status,coalesce(road_address,jibun_address) AS address,phone_normalized,geo_status,region_status,last_synced_at FROM facilities WHERE strpos(lower(name),lower(${q}))>0 ORDER BY name,id LIMIT 30 OFFSET ${(page-1)*30}`;
 if(view==="verifications")rows=await sql`SELECT id,facility_id,field_name,field_value,source_type,source_url,evidence_note,verified_at,expires_at FROM facility_verifications ORDER BY created_at DESC LIMIT 30 OFFSET ${(page-1)*30}`;
 if(view==="reports")rows=await sql`SELECT id,facility_id,report_type,message,status,created_at FROM user_reports ORDER BY created_at DESC LIMIT 30 OFFSET ${(page-1)*30}`;
 if(view==="sync")rows=await sql`SELECT source_type,status,started_at,finished_at,received_count,created_count,updated_count,failed_count FROM sync_runs ORDER BY started_at DESC LIMIT 30 OFFSET ${(page-1)*30}`;
 if(view==="seo")rows=await sql`SELECT id,canonical_url,seo_status,result_count,page_quality_score,manual_hold,last_evaluated_at FROM seo_pages ORDER BY canonical_url LIMIT 30 OFFSET ${(page-1)*30}`;
 if(view==="reviews")rows=await sql`WITH queue AS (
  SELECT d.id,s.facility_type::text AS facility_type,'DUPLICATE'::text AS category,d.public_source_id,d.reason_code AS detail,d.reviewed_at AS detected_at
  FROM facility_duplicate_reviews d JOIN source_raw_records s ON s.id=d.raw_record_id WHERE d.decision='REVIEW_REQUIRED'
  UNION ALL SELECT f.id,f.facility_type::text,'REGION',f.public_source_id,f.region_status::text,f.updated_at FROM facilities f WHERE f.region_status<>'MATCHED'
  UNION ALL SELECT f.id,f.facility_type::text,'GEO',f.public_source_id,f.geo_status::text,f.updated_at FROM facilities f WHERE f.geo_status<>'VALID'
  UNION ALL SELECT f.id,f.facility_type::text,'DATA_QUALITY',f.public_source_id,f.data_quality_score::text,f.updated_at FROM facilities f WHERE f.data_quality_score<50
 ) SELECT * FROM queue WHERE (${reviewType}='' OR facility_type=${reviewType}) AND (${reviewCategory}='' OR category=${reviewCategory}) ORDER BY detected_at DESC,id LIMIT 30 OFFSET ${(page-1)*30}`;
 const display=(value:unknown)=>value instanceof Date?value.toISOString():value==null?"—":String(value);
 return <section className="shell admin-shell"><h1>두들펫 운영 현황</h1><p>DB: 연결 성공 · PostGIS: {health.postgis?"조회 성공":"미확인"} · 지도 키: {process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY?"설정됨 (화면 QA 별도)":"미설정"}</p><div className="cost-table-wrap card content-panel"><table className="cost-table"><thead><tr><th>시설 유형</th><th>전체</th><th>OPEN</th><th>CLOSED</th><th>REVIEW_REQUIRED</th><th>좌표 누락</th><th>지역 오류</th></tr></thead><tbody>{sourceSummary.map(r=><tr key={r.facility_type}><td>{r.facility_type}</td><td>{r.total}</td><td>{r.open}</td><td>{r.closed}</td><td>{r.review_required}</td><td>{r.coordinate_missing}</td><td>{r.region_error}</td></tr>)}</tbody></table></div><div className="dashboard-grid">{counts.map((r,i)=><div className="card metric-card" key={i}><span>{r.facility_type} / {r.business_status}</span><strong>{r.count}</strong></div>)}{Object.entries(quality).map(([k,v])=><div className="card metric-card" key={k}><span>{k}</span><strong>{String(v)}</strong></div>)}</div>
 <nav className="chip-list">{[["facilities","시설"],["reviews","검토 큐"],["fees","진료비 Import"],["verifications","검증"],["reports","수정신고"],["sync","동기화"],["seo","SEO"]].map(([v,label])=><Link className="chip-link" key={v} href={`/admin?view=${v}`}>{label}</Link>)}</nav>
 {query.saved==="1"&&<p role="status">저장했습니다. 변경 이력을 기록했습니다.</p>}
 {view==="facilities"&&<form><input type="hidden" name="view" value={view}/><label>시설명 검색 <input name="q" defaultValue={q}/></label><button className="secondary-button">검색</button></form>}
 {view==="reviews"&&<form><input type="hidden" name="view" value="reviews"/><label>업종 <select name="type" defaultValue={query.type??""}><option value="">전체</option><option>HOSPITAL</option><option>PHARMACY</option><option>FUNERAL</option></select></label><label>유형 <select name="category" defaultValue={reviewCategory}><option value="">전체</option><option>DUPLICATE</option><option>REGION</option><option>GEO</option><option>DATA_QUALITY</option></select></label><button className="secondary-button">필터</button></form>}
 {view==="fees"&&<FeeImportPanel/>}
 {view!=="fees"&&<div className="card content-panel cost-table-wrap">{rows.length?<table className="cost-table"><thead><tr>{Object.keys(rows[0]).map(key=><th key={key}>{key}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{Object.entries(row).map(([key,value])=><td key={key}>{display(value)}</td>)}</tr>)}</tbody></table>:<p>등록된 데이터가 없습니다.</p>}</div>}
 <nav className="chip-list">{page>1&&<Link href={`?view=${view}&page=${page-1}&q=${encodeURIComponent(q)}`}>이전</Link>}{rows.length===30&&<Link href={`?view=${view}&page=${page+1}&q=${encodeURIComponent(q)}`}>다음</Link>}</nav>
 {view==="verifications"&&<section className="card content-panel"><h2>검증정보 등록</h2><p>공식 원본 정보는 변경하지 않습니다. 확인 근거와 확인일·만료일을 기록하세요.</p><form action="/api/admin/update" method="post"><input type="hidden" name="action" value="verification"/><div className="form-field"><label>시설 ID<input name="facilityId" required/></label></div><div className="form-field"><label>확인 항목<select name="fieldName">{["open_24h","night_service","exotic_service","cat_service","parking_available"].map(f=><option key={f}>{f}</option>)}</select></label></div><label>값 <select name="fieldValue"><option>UNKNOWN</option><option>YES</option><option>NO</option></select></label><div className="form-field"><label>출처 종류<select name="sourceType">{["OFFICIAL_WEBSITE","OFFICIAL_SOCIAL","PHONE_CONFIRMATION","KAKAO_PLACE","NAVER_PLACE","ADMIN_MANUAL","USER_REPORT_CONFIRMED"].map(s=><option key={s}>{s}</option>)}</select></label></div><div className="form-field"><label>출처 URL<input name="sourceUrl" type="url"/></label></div><div className="form-field"><label>확인 근거<textarea name="evidenceNote" required minLength={5} maxLength={1500}/></label></div><div className="form-field"><label>확인일 (한국 시간)<input name="verifiedAt" type="date" required/></label></div><div className="form-field"><label>만료일 (한국 시간)<input name="expiresAt" type="date" required/></label></div><button className="primary-button">근거와 함께 저장</button></form></section>}
 {view==="reports"&&<section className="card content-panel"><h2>신고 처리</h2><form method="post" action="/api/admin/update"><input type="hidden" name="action" value="report"/><div className="form-field"><label>신고 ID<input name="id" required/></label></div><label>처리상태<select name="status">{["UNDER_REVIEW","RESOLVED","REJECTED"].map(s=><option key={s}>{s}</option>)}</select></label><div className="form-field"><label>처리 근거<textarea name="adminNote" required minLength={5}/></label></div><button className="primary-button">처리 결과 저장</button></form></section>}
 {view==="seo"&&<section className="card content-panel"><h2>검색 노출 보류</h2><form method="post" action="/api/admin/update"><input type="hidden" name="action" value="seo"/><div className="form-field"><label>SEO 페이지 ID<input name="id" required/></label></div><label>보류<select name="hold"><option value="true">수동 noindex</option><option value="false">보류 해제 (다음 품질 평가 후 노출)</option></select></label><button className="primary-button">저장</button></form></section>}
 <form action="/api/admin/logout" method="post"><button className="secondary-button">로그아웃</button></form></section>;
}
