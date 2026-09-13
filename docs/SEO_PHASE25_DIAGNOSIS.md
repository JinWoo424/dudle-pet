# Phase 2.5 Preview stability diagnosis (in progress)

Production remains unchanged. Deployment under investigation: `5b6f236`,
`https://dudle-747n71ple-jinwoo424.vercel.app`.

## Confirmed historical failure

Vercel Runtime Logs, inspected 2026-09-13 approximately 12:04 KST, now show
18 invocations with `Vercel Runtime Timeout Error: Task timed out after 300 seconds`.
All six fixed hospital/pharmacy URLs have HTTP 504 records. The earlier `---`
status was incomplete observation before the function timeout, not a successful response.

Representative browser request `/hospital/busan`:

- Started: 2026-09-13T02:44:47.465Z.
- Request ID: `m57qc-1789267487465-e16726d78e9d`.
- `FUNCTION_INVOCATION_TIMEOUT`, HTTP 504.
- Firewall allowed; middleware 200 in 7 ms.
- Function route `/hospital/[[...segments]]`: 5 minutes / 5 minutes.
- Response finished in 300.4 seconds; Fluid function memory 285 MB.
- Deployment `dpl_9o3rmBUFwkRjexKcmRGwjmag82f3`, environment Preview.

This confirms a server-function stall, not only the client's 30-second deadline.
The blocking server stage is not yet proven. No assertion of pool exhaustion,
SQL slowness, OOM, or cold-start root cause is justified by that record alone.

## Baseline remeasurement without application changes

Six URLs, five sequential attempts each, concurrency one: **30/30 HTTP 200**.
All checked H1, canonical, OG and JSON-LD passed. First observed request 9.067 s;
subsequent responses approximately 1.8–2.1 s. Cold start is not proven merely
because the first request was slower. Exact per-request times, UTC start times,
request IDs and summary are in `reports/directory-timing-dudle-747n71ple-jinwoo424.vercel.app.json`.
Server/DB/render times remain null where unavailable, never inferred from TTFB.

## Read-only SQL evidence

Actual `queryFacilities` SQL captured in a short-lived local process. Parameters
were used only in memory and not persisted. Each query was analyzed once with
read-only transactions and a 3-second statement timeout; no DB mutation occurred.
See `reports/directory-sql.json` for actual plans and query text with placeholders.

| Type | Region | Total | Returned | Aggregate SQL ms | Page SQL ms |
|---|---|---:|---:|---:|---:|
| Hospital | Seoul | 978 | 30 | 23.070 | 31.252 |
| Hospital | Busan | 283 | 30 | 27.090 | 23.920 |
| Hospital | Yeosu | 15 | 15 | 6.663 | 6.892 |
| Pharmacy | Seoul | 2832 | 30 | 41.729 | 48.896 |
| Pharmacy | Busan | 1016 | 30 | 47.816 | 42.319 |
| Pharmacy | Yeosu | 51 | 30 | 5.367 | 6.084 |

These are PostgreSQL execution times, not Vercel network/pool wait times. They do
not explain the historical 300-second stall. Existing runtime max=4,
prepare=false, strict CA/TLS, and DATABASE_URL-only public access remain unchanged.

Minimal Preview-only stage logging is being prepared to identify the stalled
stage and metadata/page query reuse before making a behavioral fix.
