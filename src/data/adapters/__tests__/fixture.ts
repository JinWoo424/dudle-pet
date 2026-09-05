import { createHash } from "node:crypto";
import { mappedFields, type PublicApiContract } from "../contract";
export const fixtureRecords=Array.from({length:100},(_,i)=>({fixtureId:String(i+1),fixtureName:`TEST ONLY 시설 ${i+1}`,fixtureAddress:`전라남도 여수시 테스트로 ${i+1}`,fixturePhone:`061123${String(i).padStart(4,"0")}`,fixtureStatus:"registered",fixtureX:"",fixtureY:""}));
export const fixtureSample=JSON.stringify({result:"ok",total:100,items:fixtureRecords.slice(0,5)});
export const fixtureContract:PublicApiContract={
 officialDocumentUrl:"https://www.data.go.kr/",verifiedAt:"2026-09-05",endpoint:"https://apis.data.go.kr/test-fixture-not-a-real-endpoint",
 request:{keyParameter:"testKey",pageParameter:"testPage",sizeParameter:"testSize",fixed:{format:"json"}},
 response:{itemsPath:["items"],totalPath:["total"],resultCodePath:["result"],successCodes:["ok"]},
 mapping:{sampleSha256:createHash("sha256").update(fixtureSample).digest("hex"),
 fields:{...Object.fromEntries(mappedFields.map(f=>[f,null])),externalId:"fixtureId",name:"fixtureName",phone:"fixturePhone",roadAddress:"fixtureAddress",publicStatusCode:"fixtureStatus",sourceX:"fixtureX",sourceY:"fixtureY"} as PublicApiContract["mapping"] extends infer M?NonNullable<M> extends {fields:infer F}?F:never:never,
 statusField:"publicStatusCode",statuses:{registered:"OPEN",closed:"CLOSED",paused:"TEMP_CLOSED",suspended:"SUSPENDED"},sourceCrs:"EPSG:5174",coordinateOrder:"EASTING_NORTHING",sourceDateFormat:"ISO_OFFSET"}
};
