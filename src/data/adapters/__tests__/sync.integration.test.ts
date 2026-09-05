import { it,expect,vi } from "vitest";
import { randomBytes } from "node:crypto";
import postgres from "postgres";
import { fixtureContract,fixtureRecords,fixtureSample } from "./fixture";
import { MoisHospitalAdapter } from "../mois";
import { syncSource } from "../../sync";
let database:ReturnType<typeof postgres>;
vi.mock("@/db/connection",()=>({getSql:()=>database}));
vi.mock("node:fs/promises",async importOriginal=>{
 const actual=await importOriginal<typeof import("node:fs/promises")>();
 return {...actual,readFile:(...args:Parameters<typeof actual.readFile>)=>String(args[0]).includes("docs/api-samples/")?Promise.resolve(fixtureSample):actual.readFile(...args)};
});
it.skipIf(!process.env.TEST_DATABASE_URL)("PostGIS DB: 100 inserts, updates, complete snapshots, missing, closure, reopening and evidence expiry",async()=>{
 const url=process.env.TEST_DATABASE_URL!;
 if(url===process.env.DATABASE_URL)throw new Error("TEST_DATABASE_URL must be a separate disposable test database");
 const schema="dudle_test_"+randomBytes(8).toString("hex");
 database=postgres(url,{max:3,prepare:false,connection:{search_path:schema+",public,extensions"},onnotice:()=>{}});
 let created=false;
 try {
  await database.unsafe(`CREATE SCHEMA "${schema}"`);created=true;
  const {readFile}=await import("node:fs/promises");
  // The dedicated test DB must already have PostGIS. Never install extensions here.
  await database`SELECT PostGIS_Version()`;
  const [transformed]=await database`SELECT ST_X(g) AS lng,ST_Y(g) AS lat FROM (SELECT ST_Transform(ST_SetSRID(ST_MakePoint(260000,240000),5174),4326) g) t`;
  expect(Number(transformed.lng)).toBeGreaterThan(124);expect(Number(transformed.lat)).toBeGreaterThan(32);
  await database.unsafe((await readFile("drizzle/0000_initial.sql","utf8")).replace("CREATE EXTENSION IF NOT EXISTS postgis;",""));
  await database.unsafe(await readFile("drizzle/0001_production_safety.sql","utf8"));
  await database`INSERT INTO regions(id,level,name,short_name,slug,full_slug) VALUES(1,'PROVINCE','전라남도','전남','jeonnam','jeonnam')`;
  await database`INSERT INTO regions(id,parent_id,level,name,short_name,slug,full_slug) VALUES(2,1,'CITY','여수시','여수','yeosu','jeonnam/yeosu')`;
  vi.stubEnv("DATA_MODE","database");vi.stubEnv("PUBLIC_DATA_SERVICE_KEY","fixture-test-only");
  let records=fixtureRecords.map(r=>({...r}));
  vi.stubGlobal("fetch",async (url:URL)=>{
   const page=Number(url.searchParams.get("testPage"));
   return Response.json({result:"ok",total:records.length,items:records.slice((page-1)*100,page*100)});
  });
  const adapter=new MoisHospitalAdapter(fixtureContract);
  const first=await syncSource(adapter,"sample100");
  expect(first).toMatchObject({status:"SUCCESS",created:100});
  expect((await database`SELECT count(*)::int AS n FROM facilities`)[0].n).toBe(100);
  const repeated=await syncSource(adapter,"sample100");
  expect(repeated).toMatchObject({created:0,updated:0,unchanged:100});
  await database`UPDATE sync_source_snapshots SET approved_at=now(),approved_by='test-reviewer' WHERE record_count=100`;
  records[0].fixtureStatus="closed";
  records.push({...records[1],fixtureId:"101",fixtureName:"TEST ONLY 시설 101",fixtureAddress:"전라남도 여수시 테스트로 101",fixturePhone:"0611230101"});
  expect(await syncSource(adapter,"full")).toMatchObject({status:"SUCCESS",created:1,updated:1});
  expect((await database`SELECT business_status FROM facilities WHERE public_source_id='1'`)[0].business_status).toBe("CLOSED");
  records=records.filter(r=>r.fixtureId!=="2");records[0].fixtureStatus="registered";
  expect(await syncSource(adapter,"full")).toMatchObject({status:"SUCCESS",updated:1});
  expect((await database`SELECT business_status FROM facilities WHERE public_source_id='1'`)[0].business_status).toBe("OPEN");
  expect((await database`SELECT missing_streak,is_active FROM facilities WHERE public_source_id='2'`)[0]).toMatchObject({missing_streak:1,is_active:true});
  const [facility]=await database`SELECT id FROM facilities WHERE public_source_id='1'`;
  await database`UPDATE facilities SET latitude=34.76,longitude=127.66,geo_status='VALID' WHERE id=${facility.id}`;
  expect((await database`SELECT ST_DWithin(location,ST_SetSRID(ST_MakePoint(127.661,34.76),4326)::geography,1000) AS nearby FROM facilities WHERE id=${facility.id}`)[0].nearby).toBe(true);
  await database`INSERT INTO facility_verifications(facility_id,field_name,field_value,source_type,evidence_note,verified_at,expires_at) VALUES(${facility.id},'open_24h','YES','ADMIN_MANUAL','fixture evidence',now()-interval '3 days',now()+interval '1 day'),(${facility.id},'open_24h','NO','ADMIN_MANUAL','newer expired evidence',now()-interval '2 days',now()-interval '1 day')`;
  expect(await database`SELECT id FROM current_facility_verifications WHERE facility_id=${facility.id}`).toHaveLength(0);
 }finally{
  vi.unstubAllGlobals();vi.unstubAllEnvs();
  if(created&&/^dudle_test_[a-f0-9]{16}$/.test(schema))await database.unsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await database.end();
 }
},120000);
