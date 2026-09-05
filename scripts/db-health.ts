import "./env";
import { getSql, closeSql } from "../src/db/connection";
async function main(){
 try {
  const sql=getSql();
  await sql`SELECT 1`;
  await sql`SELECT PostGIS_Version()`;
  const [distance]=await sql`SELECT ST_Distance(ST_SetSRID(ST_MakePoint(127.66,34.76),4326)::geography,ST_SetSRID(ST_MakePoint(127.661,34.76),4326)::geography) AS meters`;
  const rows=await sql`SELECT name FROM schema_migrations ORDER BY name`;
  console.log(JSON.stringify({database:"ok",postgis:"ok",distanceQuery:Number(distance.meters)>0,migrations:rows.map(r=>r.name)}));
 }finally{await closeSql();}
}
main().catch(()=>{console.error("DB/PostGIS health check failed. No connection details are printed.");process.exitCode=1;});
