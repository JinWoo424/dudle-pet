import '../env';
import { closeSql, getSql } from '../../src/db/connection';
async function main() {
  const sql = getSql();
  const regions = await sql`SELECT id,parent_id,level,name,full_slug,official_code,province_code,city_code FROM regions WHERE is_active AND level IN ('PROVINCE','CITY') ORDER BY official_code`;
  const aliases = await sql`SELECT a.alias_name,a.alias_slug,r.name,r.full_slug FROM region_aliases a JOIN regions r ON r.id=a.region_id ORDER BY a.alias_slug`;
  const columns = await sql`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_name IN ('fee_import_batches','medical_fee_statistics') ORDER BY table_name,ordinal_position`;
  const counts = await sql`SELECT (SELECT count(*)::int FROM fee_import_batches) AS batches,(SELECT count(*)::int FROM medical_fee_statistics) AS rows`;
  const focus = process.argv.includes('--focus') ? regions.filter(row=>['세종특별자치시','동구','서구','중구','수원시','춘천시','청주시','천안시','전주시','포항시','창원시'].includes(String(row.name))) : regions;
  console.log(JSON.stringify({ regions:focus, aliases, columns, counts }));
}
main().catch(()=>{console.error('FEE_DB_INSPECTION_FAILED');process.exitCode=1;}).finally(closeSql);
