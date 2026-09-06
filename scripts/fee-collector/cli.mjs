import { readFile } from 'node:fs/promises';
import { cacheRoot, checkLatest, counters, discoverHtml, parsePrices, query, saveJson } from './source.mjs';

async function discover() {
  const latest = await checkLatest();
  console.log(JSON.stringify({ latestOfficialSurveyYear: latest.latest || 'UNCONFIRMED', yearSelector: latest.yearOptions, newerMention: latest.newerMention }));
  if (!latest.supported) throw new Error('SURVEY_YEAR_REVIEW_REQUIRED_STOP_BEFORE_COLLECTION');
  const contract = discoverHtml(latest.html);
  for (const p of contract.provinces) {
    p.cities = (await query('gugunList', { sido: p.code }, { scope: 'REGION_CONTRACT', province_code: p.code })).data;
    if (p.cities.some(c => !/^\d{3}$/.test(c.ADDR2_CD) || !c.ADDR2_NM)) throw new Error('CITY_CONTRACT_CHANGED');
  }
  const cityCount = contract.provinces.reduce((n, p) => n + p.cities.length, 0);
  const summary = { surveyYear: latest.latest, provinces: contract.provinces.length, cities: cityCount,
    officialItemCodes: new Set(contract.conditions.map(c => c.code)).size,
    itemAnimalPairs: new Set(contract.conditions.map(c => `${c.code}|${c.code === 'MEDIT00005' ? c.condition : ''}`)).size,
    conditions: contract.conditions.length, expectedPriceRequests: (contract.provinces.length + 1) * contract.conditions.length,
    maximumRowsBeforeSuppression: (cityCount + contract.provinces.length + 1) * contract.conditions.length };
  await saveJson('data/cache/fee-region-contract-2025.json', { ...contract, summary, yearEvidence: { ...latest, html: undefined } });
  console.log(JSON.stringify({ ...summary, ...counters }));
}
async function collect(sample) {
  const latest = await checkLatest();
  if (!latest.supported) throw new Error('SURVEY_YEAR_REVIEW_REQUIRED_STOP_BEFORE_COLLECTION');
  const contract = JSON.parse(await readFile('data/cache/fee-region-contract-2025.json', 'utf8'));
  const live = discoverHtml(latest.html);
  if (JSON.stringify(live.conditions) !== JSON.stringify(contract.conditions)) throw new Error('ITEM_CONTRACT_CHANGED');
  const conditions = sample ? contract.conditions.filter(c => ['MEDIT00001','MEDIT00005','MEDIT00010','MEDIT00011','MEDIT00015','MEDIT00016','MEDIT00017'].includes(c.code) && ['ANITY00006','ANITY00001',''].includes(c.condition)) : contract.conditions;
  const provinces = sample ? contract.provinces.filter(p => ['서울특별시','부산광역시','전라남도'].includes(p.name)) : contract.provinces;
  const rows = [], errors = [], completed = [];
  for (const c of conditions) {
    const dimensions = { mediTypeCd: c.code, animalTypeCd: c.condition };
    const total = await query('searchTotalPrice', dimensions, { scope: 'NATIONAL_PROVINCE', item_code: c.code, animal_type: c.condition });
    for (const r of total.data) rows.push({ scope: r.SIDO_CD === '99' ? 'NATIONAL' : 'PROVINCE', source: r, condition: c, snapshot: total.snapshot });
    for (const p of provinces) {
      const cities = await query('searchPrice', { sidoCd: p.code, ...dimensions }, { scope: 'CITY', province_code: p.code, item_code: c.code, animal_type: c.condition });
      for (const r of cities.data) rows.push({ scope: 'CITY', source: r, condition: c, snapshot: cities.snapshot });
      completed.push(`${p.code}|${c.code}|${c.condition}`);
      await saveJson(`${cacheRoot}/checkpoint-${sample ? 'sample' : 'national'}.json`, { completed, counters, updatedAt: new Date().toISOString() });
    }
    console.log(JSON.stringify({ completedCondition: `${c.code}|${c.condition}`, rows: rows.length, ...counters }));
  }
  const seen = new Set();
  for (const [i, r] of rows.entries()) {
    try {
      r.prices = parsePrices(r.source);
      const key = [r.scope, r.source.SIDO_CD, r.source.ADDR2_NM ?? '', r.condition.code, r.condition.condition].join('|');
      if (seen.has(key)) throw new Error('DUPLICATE_ROW');
      seen.add(key);
    } catch (e) { errors.push({ row: i, code: e.message }); }
  }
  const result = { surveyYear: 2025, retrievedAt: new Date().toISOString(), counters: { ...counters }, rows, errors, conditions: conditions.length, provinces: provinces.length };
  await saveJson(`${cacheRoot}/${sample ? 'sample' : 'national'}.json`, result);
  console.log(JSON.stringify({ rows: rows.length, parseSuccess: rows.length - errors.length, errors, ...counters }));
  if (errors.length) process.exitCode = 1;
}
const command = process.argv[2];
try {
  if (command === 'check-latest') {
    const r = await checkLatest();
    console.log(JSON.stringify({ latestOfficialSurveyYear: r.latest || 'UNCONFIRMED', selectableYears: r.yearOptions, newerMention: r.newerMention, supported: r.supported }));
  } else if (command === 'discover') await discover();
  else if (command === 'sample') await collect(true);
  else if (command === 'dry-run') await collect(false);
  else throw new Error('COMMAND_REQUIRED');
} catch (e) {
  console.error(/^[A-Z0-9_]+$/.test(e.message) ? e.message : 'FEE_COLLECTOR_FAILED_NO_SECRETS_LOGGED');
  process.exitCode = 1;
}
