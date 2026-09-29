# Discover Leads: Lead Intelligence Engine

The CRM's **Discover Leads** page (`/discover`, admin + manager) finds real businesses, analyzes their public online presence, scores the sales opportunity for Lithos Labs, recommends a package with a suggested price, and moves them into the existing Leads pipeline.

```
Discover → normalize + dedupe → enrich → analyze website → opportunities → score → price → Add to Leads → call → follow up → proposal
```

## 1. Setup (one time)

| Step | What to do |
|---|---|
| 1 | Google Cloud Console → APIs & Services → **enable "Places API (New)"** on the project that owns your Places key. (If only the legacy Places API is enabled, the engine falls back to it automatically, but the New API is cheaper per useful result because rating, reviews, phone and website come back in one call.) |
| 2 | Vercel → Settings → Environment Variables → add **`GOOGLE_PLACES_API_KEY`** (server-side only). The old `VITE_GOOGLE_PLACES_KEY` still works as a fallback, but see the security note below. |
| 3 | Redeploy. Sign out and back in once so your session has a current token. |
| 4 | Open **Discover Leads → Settings** and review the AWG price table (seeded as starting values). |

Database tables are created automatically on first use. Existing tables are only extended (new columns on `leads`; the `leads.status` / `activities.outcome` value lists are widened if a CHECK constraint exists). Nothing is dropped.

### Security note: rotate the old Places key
The previous Discover tab read `VITE_GOOGLE_PLACES_KEY` in browser code. Vite bakes `VITE_*` variables into the public JavaScript bundle, so that key has likely been visible to anyone who opened the CRM's source. Please:
1. Create a new key, restrict it to **Places API (New)** (and legacy Places if you still need it), and set it as `GOOGLE_PLACES_API_KEY`.
2. Delete the old key in Google Cloud, then remove `VITE_GOOGLE_PLACES_KEY` from Vercel.

`/api/places` used to be an open Google proxy anyone could call with your key. It is now the authenticated Lead Intelligence API.

## 2. How it works

**Stage 1: discovery.** Each industry you pick is one Text Search query (20 results per request, up to 60 per search), with location, optional radius (geocoded center + distance check) and minimum rating applied at the provider. Results are normalized to one shape and deduplicated by provider ID, website domain, phone (plus a loose name match), and name + street address, both within the search and against everything discovered before. Existing CRM leads are matched the same way, so a business is never added twice.

**Stage 2: enrichment.** Only needed for the legacy fallback (phone/website come from Place Details), and only for the top results. "Refresh data" on any business re-fetches it on demand.

**Stage 3: website analysis.** Runs automatically only for the top-scoring results that have a website (default 12, configurable), in small batches so the page keeps updating. Everything else is on demand ("Analyze"). The analyzer:
- respects robots.txt (user agent `LithosLabsBot`), never logs in, submits forms or bypasses CAPTCHAs or paywalls;
- refuses private and internal network addresses on every redirect;
- uses short timeouts and a size cap;
- reads the homepage and sitemap, and HEAD-checks up to 4 internal links.

It records evidence for every detection: HTTPS, mobile viewport, click-to-call, contact/quote forms, booking platforms (Calendly, Acuity, Square, Booksy, Vagaro, Fresha, ServiceTitan, Jobber, OpenTable, and more), e-commerce/ordering, payments, CRM/marketing tools, chat, analytics, CMS, social links, copyright year, load time and page size.

**Data rule.** Nothing is guessed. Every check is reported as *detected*, *not detected* or *unknown*. Missing data shows as "Not available" / "Email unavailable". CRM status is phrased as "No CRM detected from publicly observable information". An email is only stored if the business publishes it on its own site (mailto link), and its source is shown.

**Lead Intelligence Score (0–100).** The score measures how strong a sales opportunity this is for Lithos Labs. It is not a rating of the business. It is the transparent sum of six factors with editable maximums:

| Factor | Max points |
|---|---|
| Business activity | 20 |
| Website opportunity | 25 |
| Booking opportunity | 15 |
| CRM opportunity | 15 |
| Automation opportunity | 15 |
| Data confidence | 10 |

Every point comes with the finding that produced it.

**Pricing engine.** Settings holds one editable price table per currency (USD and AWG, and you can add more). There is no automatic currency conversion. Each market maps to a currency. The package engine explains its recommendation, for example: "Recommended because this business has an established customer base (236 reviews at 4.9), no website listed, and no online booking detected." The suggested price is an internal recommendation. You can edit it before adding the business to Leads, or save it to the lead later.

**Pipeline.** Discovered businesses enter the existing `leads` table with status **Discovered**. The status list now includes Discovered, Qualified, Contacted, Interested, Demo Sent, Call Scheduled, Proposal Sent, Negotiation, Won (existing "closed"), Lost and Do Not Contact.

Call outcomes (No answer, Voicemail, Interested, Not interested, Call back, Demo requested, Proposal requested, Wrong number, Do not contact) are logged to the lead's activity timeline and move the status forward only, never backwards. A next follow-up date creates a follow-up task. Calls can be logged from the Discover page or from any lead's page ("Log call + follow-up").

**Cost control.** You can cap searches per day, results per search, auto-analysis count, analyses per day and industries per search. Every provider request is logged with an estimated cost (per-request estimates are editable in Settings). The header and Dashboard show today's usage and month-to-date estimated cost.

## 3. What's intentionally not included

- **Add to campaign:** the CRM has no campaign module yet. Use Assign or Export in the meantime.
- **Business size / business age filters:** Google Places doesn't provide them, so they aren't shown rather than faked.
- **Sending email/SMS:** outreach is generated for review and copy (or "Open in mail app"). SMS text includes an opt-out, and the UI reminds you about US consent rules (TCPA).

## 4. Files

- `api/places.js`: endpoint (60s max duration via `vercel.json`)
- `api/_intel-handler.js`: actions, schema, persistence, limits
- `api/_intel-core.js`: catalogs, normalization, dedupe, scoring, pricing (pure)
- `api/_intel-providers.js`: provider abstraction (Google New, Google legacy, manual)
- `api/_intel-analyze.js`: SSRF-safe fetch, robots.txt, signal and technology detection
- `api/_auth.js`: shared admin session tokens (also used by Payments & Documents)
- `src/pages/LeadIntelligence.jsx` and `src/components/intel/*`: UI
- `src/lib/intelApi.js`, `src/lib/intelOutreach.js`, `src/lib/leadStatuses.js`
