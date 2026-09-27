# Naver IndexNow

Production origin: https://pet.dudle.co.kr

The root public text file is an intentionally public ownership proof, not a private API credential. No environment variable, database migration or scheduled job is required.

## Submit an actual change

Dry-run the facility metadata rollout:

```sh
pnpm run indexnow --change facility-ctr-a324221 --facility-details
```

After the ownership file and the changed pages are deployed, add `--submit`.
Only canonical Production facility detail URLs in the current approved sitemap are selected. Requests are sequential and limited to 10,000 URLs each.

For future changes use a UTF-8 newline-delimited list of full canonical URLs:

```sh
pnpm run indexnow --change YOUR_CHANGE_ID --urls-file .local-secrets/changed-urls.txt
```

Inspect the dry-run before adding `--submit`. Use the same change ID when resuming a partially accepted submission. Accepted URLs are recorded in the Git-ignored `.local-secrets/indexnow-submissions.json`. Do not delete this ledger or change the ID merely to resend unchanged pages. This local ledger does not deduplicate across different machines; use the same operator checkout.

No automatic retries or daily full-site submissions. If a request times out, receipt is uncertain: investigate before retrying. HTTP 200 means successful submission; 202 means receipt with ownership verification pending. Neither means the URLs were crawled or indexed. The sitemap is the eligibility source, not an independent live audit of every page.

Official references:
- https://searchadvisor.naver.com/guide/indexnow-api-key
- https://searchadvisor.naver.com/guide/indexnow-request
