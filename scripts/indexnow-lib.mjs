export const origin = "https://pet.dudle.co.kr";
// Public ownership proof, intentionally served as a static text file (not a secret).
export const key = "9dc3beecbcae4f99b57c41dc12c72da7";
export const keyLocation = `${origin}/${key}.txt`;
export const endpoint = "https://searchadvisor.naver.com/indexnow";

export function productionUrl(value) {
  const url = new URL(value);
  if (url.origin !== origin || url.username || url.password || url.search || url.hash) {
    throw new Error("Only canonical Production URLs without query strings are allowed");
  }
  return url.href;
}

export function facilityDetailUrl(value) {
  return /^\/(hospital|pharmacy|funeral)\/(?:[^/]+\/)+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(new URL(productionUrl(value)).pathname);
}

export function locations(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((match) =>
    productionUrl(match[1].trim().replace(/&amp;/g, "&")));
}

export function batches(values, size = 10000) {
  if (!Number.isInteger(size) || size < 1 || size > 10000) throw new Error("Invalid batch size");
  const unique = [...new Set(values.map(productionUrl))];
  return Array.from({ length: Math.ceil(unique.length / size) }, (_, i) => unique.slice(i * size, (i + 1) * size));
}
