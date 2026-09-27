import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { origin, key, keyLocation, endpoint, productionUrl, facilityDetailUrl, locations, batches } from "./indexnow-lib.mjs";

async function main() {
  const args = process.argv.slice(2);
  const submit = args.includes("--submit");
  const changeIndex = args.indexOf("--change");
  const change = changeIndex >= 0 ? args[changeIndex + 1] : null;
  const allDetails = args.includes("--facility-details");
  const fileIndex = args.indexOf("--urls-file");
  const file = fileIndex >= 0 ? args[fileIndex + 1] : null;
  if (!change || !/^[a-zA-Z0-9_-]{1,100}$/.test(change) || allDetails === Boolean(file)) {
    throw new Error("Use --change ID with either --facility-details or --urls-file PATH; add --submit to send");
  }
  for (let i = 0; i < args.length; i++) {
    if (["--change", "--urls-file"].includes(args[i])) { i++; continue; }
    if (!["--submit", "--facility-details"].includes(args[i])) throw new Error("Unknown option");
  }
  async function getText(url) {
    const response = await fetch(productionUrl(url), { redirect: "error", signal: AbortSignal.timeout(45000) });
    if (response.status !== 200) throw new Error(`Production read failed: HTTP ${response.status}`);
    return response.text();
  }
  const index = await getText(`${origin}/sitemap.xml`);
  const approved = new Set();
  if (index.includes("<sitemapindex")) {
    for (const shard of locations(index)) {
      if (!/^\/sitemaps\/\d+\.xml$/.test(new URL(shard).pathname)) throw new Error("Unexpected sitemap shard");
      for (const url of locations(await getText(shard))) approved.add(url);
    }
  } else {
    for (const url of locations(index)) approved.add(url);
  }
  const urls = [...new Set(allDetails
    ? [...approved].filter(facilityDetailUrl)
    : (await readFile(file, "utf8")).split(/\r?\n/).map(x => x.trim()).filter(Boolean).map(productionUrl))].sort();
  if (!urls.length || urls.some(url => !approved.has(url))) throw new Error("Empty selection or URL absent from approved sitemap");
  const ledgerPath = new URL("../.local-secrets/indexnow-submissions.json", import.meta.url);
  let ledger = {};
  try { ledger = JSON.parse(await readFile(ledgerPath, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const sent = new Set(ledger[change]?.urls ?? []);
  const pending = urls.filter(url => !sent.has(url));
  const groups = batches(pending);
  const categories = Object.fromEntries(["hospital", "pharmacy", "funeral"].map(type => [type, urls.filter(url => new URL(url).pathname.startsWith(`/${type}/`)).length]));
  console.log(JSON.stringify({ mode: submit ? "submit" : "dry-run", change, sitemapCount: approved.size, selected: urls.length, pending: pending.length, batches: groups.length, categories }));
  if (!submit || !pending.length) return;
  if ((await getText(keyLocation)).trim() !== key) throw new Error("Deployed ownership proof does not match");
  await mkdir(new URL("../.local-secrets/", import.meta.url), { recursive: true });
  for (const [i, urlList] of groups.entries()) {
    const response = await fetch(endpoint, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(60000),
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(origin).host, key, keyLocation, urlList }),
    });
    console.log(JSON.stringify({ batch: i + 1, count: urlList.length, httpStatus: response.status }));
    if (![200, 202].includes(response.status)) throw new Error("IndexNow request not accepted; stopped without automatic retries");
    urlList.forEach(url => sent.add(url));
    ledger[change] = { urls: [...sent], submittedAt: new Date().toISOString(), lastHttpStatus: response.status, selectionHash: createHash("sha256").update(urls.join("\n")).digest("hex") };
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2));
  }
  console.log("Submission received; crawl and indexing are not guaranteed.");
}

main().catch(() => { console.error("IndexNow stopped. Check options, Production availability, ownership proof and reported HTTP status. No automatic retry was performed."); process.exitCode = 1; });
