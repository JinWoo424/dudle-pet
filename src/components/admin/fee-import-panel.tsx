"use client";
import { useState } from "react";

type Preview={totalRows:number;validRows:number;regionMatched:number;historicalRegionMatched:number;historicalOnly:number;priceParsingErrors:number;rangeErrors:number;medianErrors:number;averageErrors:number;duplicateKeys:number;missingItems:string[];unknownItems:number;invalidDimensions:number;regionErrors:number;alreadyImported:boolean;canImport:boolean;errors:{row:number;codes:string[]}[]};

export function FeeImportPanel(){
 const [file,setFile]=useState<File|null>(null);const [preview,setPreview]=useState<Preview|null>(null);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);const [rollbackId,setRollbackId]=useState("");
 async function submit(path:string){
  if(!file)return;setBusy(true);setMessage("");
  try{const body=new FormData();body.set("file",file);const response=await fetch(path,{method:"POST",body});const data=await response.json();if(!response.ok)throw new Error(data.error||"요청 실패");
   if(path.endsWith("preview"))setPreview(data);else{setMessage(`${data.imported}행을 versioned batch로 저장했습니다.`);setPreview(null);}
 }catch(error){setMessage(error instanceof Error?error.message:"요청 실패");}finally{setBusy(false);}
 }
 async function rollback(){
  setBusy(true);setMessage("");try{const response=await fetch("/api/admin/fees/rollback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({batchId:rollbackId})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Rollback 실패");setMessage("선택한 batch를 비활성화했습니다. 원본 행과 감사 이력은 보존됩니다.");setRollbackId("");}catch(error){setMessage(error instanceof Error?error.message:"Rollback 실패");}finally{setBusy(false);}
 }
 return <section className="card content-panel"><h2>공식 진료비 파일 Preview</h2><p>공식 파일을 내부 JSON 계약으로 변환한 뒤 업로드합니다. Preview 성공 전에는 저장할 수 없으며 동일 파일 hash는 재등록되지 않습니다.</p>
  <div className="form-field"><label htmlFor="fee-file">2025 공식 진료비 JSON</label><input id="fee-file" type="file" accept="application/json,.json" onChange={event=>{setFile(event.target.files?.[0]??null);setPreview(null);setMessage("");}}/></div>
  <div className="detail-cta"><button className="secondary-button" disabled={!file||busy} onClick={()=>submit("/api/admin/fees/preview")}>Preview</button><button className="primary-button" disabled={!file||busy||!preview?.canImport} onClick={()=>submit("/api/admin/fees/import")}>검증 결과로 Import</button></div>
  {message&&<p role="status">{message}</p>}
  {preview&&<><div className="dashboard-grid"><div className="metric-card"><span>전체 / 정상</span><strong>{preview.totalRows} / {preview.validRows}</strong></div><div className="metric-card"><span>현재 Region 매칭</span><strong>{preview.regionMatched}</strong></div><div className="metric-card"><span>Historical crosswalk</span><strong>{preview.historicalRegionMatched}</strong></div><div className="metric-card"><span>Historical only</span><strong>{preview.historicalOnly}</strong></div><div className="metric-card"><span>가격 parsing 오류</span><strong>{preview.priceParsingErrors}</strong></div><div className="metric-card"><span>범위/중간/평균 오류</span><strong>{preview.rangeErrors+preview.medianErrors+preview.averageErrors}</strong></div><div className="metric-card"><span>중복 key</span><strong>{preview.duplicateKeys}</strong></div><div className="metric-card"><span>지역 오류</span><strong>{preview.regionErrors}</strong></div></div>
   <p><strong>{preview.canImport?"Import 가능":"Import 차단"}</strong>{preview.alreadyImported?" · 동일 파일이 이미 등록됨":""}</p>
   {preview.missingItems.length>0&&<p>누락 항목: {preview.missingItems.join(", ")}</p>}
   {preview.errors.length>0&&<div className="cost-table-wrap"><table className="cost-table"><thead><tr><th>행</th><th>오류</th></tr></thead><tbody>{preview.errors.map(error=><tr key={error.row}><td>{error.row}</td><td>{error.codes.join(", ")}</td></tr>)}</tbody></table></div>}</>}
  <hr/><h3>Version rollback</h3><p>성공 batch만 비활성화합니다. 통계 행과 감사 이력은 삭제하지 않습니다.</p><div className="form-field"><label htmlFor="fee-batch-id">Batch ID</label><input id="fee-batch-id" value={rollbackId} onChange={event=>setRollbackId(event.target.value)} placeholder="UUID"/></div><button className="secondary-button" disabled={busy||!/^[0-9a-f-]{36}$/i.test(rollbackId)} onClick={rollback}>Batch 비활성화</button>
 </section>;
}
