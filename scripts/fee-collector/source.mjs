// Offline collection only. Never imported by the application runtime.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
import { JSDOM } from 'jsdom';

export const sourceUrl = 'https://animalclinicfee.or.kr/info/payInfo.do';
export const cacheRoot = 'data/cache/fees-2025';
export const parseVersion = 'public-ui-2025-v1';
export const counters = { requests: 0, cacheHits: 0, httpErrors: 0 };
const hash = value => createHash('sha256').update(value).digest('hex');
let lastRequest = 0;
export async function saveJson(path, value) {
  await mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  await writeFile(`${path}.tmp`, JSON.stringify(value, null, 2));
  await rename(`${path}.tmp`, path);
}
export async function request(url, params, metadata = {}, fresh = false) {
  const method = params ? 'POST' : 'GET';
  const body = params ? new URLSearchParams(params).toString() : '';
  const fingerprint = hash(`${method}\n${url}\n${body}`);
  const path = `${cacheRoot}/snapshots/${fingerprint}`;
  if (!fresh) {
    try {
      const meta = JSON.parse(await readFile(`${path}.json`, 'utf8'));
      const text = gunzipSync(await readFile(`${path}.gz`)).toString('utf8');
      if (hash(text) !== meta.content_hash) throw new Error('CACHE_HASH_MISMATCH');
      counters.cacheHits++;
      return { text, metadata: meta };
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 1000 - (Date.now() - lastRequest)) + (attempt ? 2000 * 2 ** attempt : 0)));
    lastRequest = Date.now();
    counters.requests++;
    let response;
    try {
      response = await fetch(url, { method, redirect: 'error', signal: AbortSignal.timeout(30000),
        headers: params ? { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8', AJAX: 'true' } : {},
        ...(params ? { body } : {}) });
    } catch { counters.httpErrors++; if (attempt === 2) throw new Error('PUBLIC_SOURCE_NETWORK_FAILED'); continue; }
    if (!response.ok) {
      counters.httpErrors++;
      if ((response.status === 429 || response.status >= 500) && attempt === 0) continue;
      throw new Error(`PUBLIC_SOURCE_HTTP_${response.status}_STOP`);
    }
    const text = await response.text();
    const meta = { ...metadata, source_url: url, source_page: sourceUrl, request_method: method,
      request_parameters: params ?? {}, request_fingerprint: fingerprint, content_hash: hash(text),
      retrieved_at: new Date().toISOString(), parse_version: parseVersion };
    await mkdir(`${cacheRoot}/snapshots`, { recursive: true });
    await writeFile(`${path}.gz`, gzipSync(text));
    await saveJson(`${path}.json`, meta);
    return { text, metadata: meta };
  }
  throw new Error('PUBLIC_SOURCE_RETRY_EXHAUSTED');
}
export async function checkLatest() {
  const page = await request(sourceUrl, undefined, { scope: 'CONTRACT' }, true);
  const intro = await request('https://animalclinicfee.or.kr/info/introduction.do?update=251104', undefined, { scope: 'YEAR_EVIDENCE' }, true);
  const notices = await request('https://animalclinicfee.or.kr/board/boardList.do?bbs_id=notice', undefined, { scope: 'YEAR_EVIDENCE' }, true);
  const document = new JSDOM(page.text).window.document;
  const yearOptions = [...document.querySelectorAll('select')].filter(e => /year|년도|연도/i.test(`${e.name} ${e.id} ${e.textContent}`))
    .flatMap(e => [...e.options].map(o => o.textContent.match(/20\d{2}/)?.[0])).filter(Boolean).map(Number);
  const evidence = new JSDOM(intro.text).window.document.body.textContent;
  const confirmed = [...evidence.matchAll(/(20\d{2})년\s*기준\s*[\d,]+\s*개소/g)].map(m => Number(m[1]));
  const newerMention = [page.text, intro.text, notices.text].some(t => /202[6-9]년[^<>\n]{0,60}(?:조사\s*결과|통계\s*공개|진료비.*공개)/.test(t));
  const latest = Math.max(0, ...yearOptions, ...confirmed);
  return { latest, yearOptions, newerMention, supported: latest === 2025 && !newerMention,
    checkedAt: new Date().toISOString(), evidenceUrl: 'https://animalclinicfee.or.kr/info/introduction.do?update=251104', html: page.text };
}
export function discoverHtml(html) {
  const document = new JSDOM(html).window.document;
  const provinces = [...document.querySelectorAll('#sido1 option')].filter(o => /^\d{2}$/.test(o.value))
    .map(o => ({ code: o.value, name: o.textContent.trim() }));
  const conditions = [...document.querySelectorAll('input[name="radio"][data-medi-type]')].map(e => ({
    code: e.dataset.mediType, condition: e.dataset.animalType, title: e.dataset.title,
    detail: e.dataset.detail, sourceCategory: e.dataset.category, selector: `#${e.id}`,
  }));
  if (!provinces.length || !conditions.length) throw new Error('PUBLIC_UI_CONTRACT_MISSING');
  if (new Set(conditions.map(c => `${c.code}|${c.condition}`)).size !== conditions.length) throw new Error('DUPLICATE_UI_CONDITION');
  return { provinces, conditions };
}
export async function query(operation, parameters, metadata = {}, fresh = false) {
  if (!['gugunList', 'searchPrice', 'searchTotalPrice'].includes(operation)) throw new Error('UNAPPROVED_OPERATION');
  const result = await request(`https://animalclinicfee.or.kr/info/${operation}.json`, parameters, { survey_year: 2025, ...metadata }, fresh);
  const data = JSON.parse(result.text);
  if (!Array.isArray(data)) throw new Error('PUBLIC_RESULT_NOT_ARRAY');
  return { data, snapshot: result.metadata.request_fingerprint };
}
export function parsePrice(value) {
  if (value == null || (typeof value === 'string' && /^(?:\s*|-|없음)$/.test(value.trim()))) return null;
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('PRICE_PARSE_ERROR');
  const text = String(value).replace(/[,\s원]/g, '');
  if (!/^\d+$/.test(text)) throw new Error('PRICE_PARSE_ERROR');
  const price = Number(text);
  if (!Number.isSafeInteger(price)) throw new Error('PRICE_PARSE_ERROR');
  return price;
}
export function parsePrices(row) {
  const minimum = parsePrice(row.MIN_PRICE), median = parsePrice(row.MID_PRICE);
  const average = parsePrice(row.AVG_PRICE), maximum = parsePrice(row.MAX_PRICE);
  if ((minimum !== null && maximum !== null && minimum > maximum) || [median, average].some(v => v !== null && ((minimum !== null && v < minimum) || (maximum !== null && v > maximum)))) throw new Error('PRICE_RANGE_REVIEW_REQUIRED');
  return { minimum, median, average, maximum };
}
