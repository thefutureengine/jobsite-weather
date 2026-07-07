# Validation Run — Audit Remediation 1.1.1

**Date:** 2026-07-06 · **Branch:** `fix/audit-1.1.1` · **Spec:** `docs/FIX-SPEC-1.1.1.md`
**Method:** spec → implement → validate → commit per phase (5 phase commits).
**Ship artifact:** `js/app-bundle.js` (authoritative; source modules diverged — see spec).

## Scope executed
All approved findings: C1, C2, H1–H7, M1–M10, L1–L9. Two LOW items intentionally
deferred with rationale (L4 dedup, L7 template-drawable deletion) — see HUMAN_TASKS.

## Acceptance checks

### Build / integrity
| Check | Result |
|-------|--------|
| `node --check js/app-bundle.js` (after every phase) | ✅ parses |
| `node --check` foreman.js / restore-pro.js / sw.js / vendored supabase | ✅ all parse |
| `npm run build:www` | ✅ `www/` regenerated (incl. `js/vendor/supabase.min.js`) |
| `npx cap sync android` | ✅ copied to `assets/public` |
| Bundled `assets/public/js/app-bundle.js` == post-fix source | ✅ SHA-1 match |
| Bundled `index.html` == post-fix source | ✅ SHA-1 match |
| Vendored Supabase present in APK assets | ✅ |
| AAB versionCode / versionName | 6 / 1.1.1 |

### Correctness (unit-verified)
- **H2 timezone** — simulated device=EST viewing a PST site at 20:00Z:
  `locationNow()` resolves to 12:00 PST and the "next hours" filter keeps
  12:00/13:00/14:00 (drops 10:00/11:00). ✅ Matches expected location-local behavior.
- **H3 escape** — `esc('<img src=x onerror=alert(1)> "Bob\'s & Co"')` →
  `&lt;img src=x onerror=alert(1)&gt; &quot;Bob&#39;s &amp; Co&quot;`. ✅ Inert.
- **H4 parse guards** — every persisted `JSON.parse` (`jw_locs`, `jw_notify`,
  `jw_notes`, `jw_foreman_usage`, project locs) routed through `safeParse` →
  returns safe default on corrupt input; module-load reads no longer throw. ✅
- **M5** — empty `precipitation_probability` array now yields `0`, not `-Infinity`. ✅

### Security (code-verified)
- **C2** — `foreman.js` builds the system prompt from a fixed server template;
  client `systemPrompt` is no longer accepted (both callers send structured data).
  CORS pinned to app origins; `question`/`notes`/`conditions` size-capped; GET
  keyPresent probe removed (L2); per-user/per-IP daily limit (Netlify Blobs, fail-open).
- **H1** — `restore-pro.js` derives the email from a verified Supabase session
  (`/auth/v1/user`), ignores any body email; free-text restore replaced with
  sign-in-to-restore; `claimFoundingCrewBenefit` requires a session token.
- **H3** — `esc()` applied to Foreman answer, crew email, site card
  (projectName/label/trade), calendar labels, and NWS event/headline.

### Wrapper (C1/H5/M1)
- `versionCode 6`, `versionName "1.1.1"`; `ACCESS_COARSE/FINE_LOCATION` declared +
  runtime request in `MainActivity`; `allowBackup=false`; SW registration guarded
  off native + stale SW unregistered; cache `jobsite-wx-v17`.

### Manual smoke (to run post-deploy, listed for the record)
ZIP search · city search ("Austin, TX") · GPS + denied/timeout fallback · trade
switch · day modal hours (days 3–7) · Foreman gated at 7/day · settings persistence ·
malicious projectName/crew-email/AI-answer render inert · corrupt `jw_locs` still boots.

## Lighthouse (before vs after)

| Category | Before (live 1.1.0) | After (post-fix) |
|----------|--------------------:|-----------------:|
| Performance | 87 | 70 †|
| Accessibility | 82 | **96** |
| Best Practices | 96 | 96 |
| SEO | 100 | 100 |

**Accessibility 82 → 96.** Resolved from the before-run: `select-name` (trade select
now labelled), `label-content-name-mismatch` (Go button), and the contrast failures on
small `--subtle` text (raised to 0.62 + 11px floor). Live regions, dialog roles,
tablist semantics, focus-visible, and 44px targets all landed.

Two audits still flag, both pre-existing and by-design:
- **color-contrast (logo `<span>`)** — the "JOBSITE WEATHER" wordmark renders its
  two-tone look with `-webkit-text-stroke`; Lighthouse can't measure the stroke and
  sees the fill (#0a1520) on surface as 1.1:1. It is legible in practice. Left
  unchanged to preserve the brand mark — a high-contrast fallback fill is available
  on request (noted, not shipped, to avoid a unilateral brand change).
- **geolocation-on-start** — the app auto-locates on load; intrinsic to a weather app.

**† Performance 87 vs 70 is NOT a like-for-like comparison and does not indicate a
regression.** Before = the live site over Netlify's CDN (gzip/brotli, HTTP/2, edge
cache). After = the built `www/` served by a local `http-server` (no compression, no
HTTP/2, cold, localhost). The 1.1.1 changes *reduce* the real-world critical path —
Supabase is now same-origin and `defer`ed (was a render-blocking third-party CDN
script), and both scripts defer — so production perf should hold or improve. A true
after-number requires measuring the deployed site post-merge (step 2 in HUMAN_TASKS).
