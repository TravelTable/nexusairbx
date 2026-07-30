# Search Console rollout checklist

Use this checklist for the homepage intent update, specialist landing-page evidence, and the capped icon publication set.

## Before deployment

- Export Search Console page and query data for the previous 16, 28, and 90 days.
- Record clicks, impressions, CTR, and average position for the homepage and the five specialist landing pages.
- Save the sitemap-generation counts for qualified, published, unpublished-qualified, and excluded icons.
- Confirm the published icon manifest contains no more than 150 unique, sorted IDs.
- Confirm the icon sitemap contains exactly the same IDs as the published manifest.

## Deployment-day inspection

Inspect these six pages:

- `https://www.nexusrbx.com/`
- `https://www.nexusrbx.com/roblox-script-generator`
- `https://www.nexusrbx.com/roblox-ai-scripter`
- `https://www.nexusrbx.com/roblox-studio-script-generator`
- `https://www.nexusrbx.com/roblox-lua-script-generator`
- `https://www.nexusrbx.com/roblox-gui-maker`

For each page:

- Confirm the live URL returns HTTP 200.
- Confirm the canonical is self-referencing and uses the preferred `www` host.
- Confirm the rendered title, H1, description, and evidence example are present.
- Confirm the page is not blocked by a robots directive.
- Run URL Inspection, test the live URL, and request indexing.

Inspect the icon boundary:

- Test at least three IDs from the published manifest. Each should return HTTP 200, be indexable, and use a self-referencing canonical.
- Test the first qualified icon outside the release boundary from the sitemap-generation report. It should return HTTP 404 with `noindex`.
- Test a known deleted or restricted icon. It should return HTTP 410 with `noindex`.
- Confirm public but unpublished icon URLs do not fall through to a generic indexable page.

Submit `https://www.nexusrbx.com/sitemap.xml` after the live checks pass.

## Monitoring cadence

### Days 1–14

- Check indexing and server errors daily.
- Watch the six priority pages for canonical changes, accidental `noindex`, soft 404s, and duplicate-title warnings.
- Compare homepage clicks, impressions, CTR, and average position with the pre-deployment baseline.
- Review queries shared by the homepage and specialist pages for cannibalization.
- Compare discovered and indexed icon counts with the 150-page published set.

### Weeks 3–8

- Review the same metrics weekly using equivalent day-of-week windows.
- Segment branded and non-branded queries.
- Record whether each specialist page is gaining impressions for its intended query family.
- Expand the icon publication cap only after the current set is consistently crawled, indexed, and serving useful impressions.

## Rollback triggers

Roll back or hotfix immediately if:

- Any priority page returns 5xx, loses its canonical, or becomes `noindex`.
- The icon sitemap and published manifest no longer match.
- Published icon pages return 404, or unpublished icon pages return indexable 200 responses.
- A material share of inspected URLs is classified as a soft 404 because the evidence or page content is missing.

Do not roll back solely because rankings fluctuate during the first few days. Annotate the deployment date and compare stable 14-day and 28-day windows before judging performance.

## Release record

Record:

- Deployment date and commit.
- Sitemap qualified, published, unpublished-qualified, and excluded counts.
- The first and last published icon IDs.
- The first qualified icon outside the boundary.
- URL Inspection results for the six priority pages and the icon boundary samples.
- Any follow-up actions, owner, and review date.
