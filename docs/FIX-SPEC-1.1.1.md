# JobSite Weather — Remediation Spec 1.1.1

**Source:** Full audit (2026-07-06), all findings approved for execution.
**Branch:** `fix/audit-1.1.1` (cut from `main` @ `93530ea`).
**Ship target:** `js/app-bundle.js` is authoritative — it is the only script `index.html` loads and it has diverged from `js/*.js` source modules (bundle carries hotfixes the modules lack). All JS edits land in `app-bundle.js`; source modules are updated where they still track, but the bundle is the artifact of record. See [Divergence note](#divergence).

**Version:** `versionCode 5 / 1.1.0` → `versionCode 6 / 1.1.1`.

**Method:** spec → implement → validate → commit per phase. Commit at each phase milestone. Merge to `main` when the full run is green.

---

## Divergence note

There is **no committed bundler**. `package.json` only has `build:www` (file copy) and `sync` (copy + `cap sync`). `app-bundle.js` was hand/agent-edited directly after the last concat (it lacks the `wwSecondary` ReferenceError that still sits in `js/weather.js:362`, and carries `currentDayIndex` day-modal logic absent from `js/app.js`). Therefore:
- **Edit `app-bundle.js` directly.** Re-concatenating the stale modules would regress live fixes.
- After JS/asset edits: `npm run build:www` (regenerates `www/` from root) → `npx cap sync android` (bundles into `android/app/src/main/assets/public`).
- Establishing a real build step is filed as a follow-up in HUMAN_TASKS.

---

## Phase 0 — Wrapper & release (C1, H5, H6, M1)

| ID | Fix | File(s) | Acceptance |
|----|-----|---------|-----------|
| C1 | Bump `versionCode 6`, `versionName "1.1.1"`; rebuild AAB from post-fix `www/` | `android/app/build.gradle` | AAB reports vc6/1.1.1; bundled `app-bundle.js` == post-fix root (hash match) |
| H5 | Declare `ACCESS_COARSE_LOCATION` + `ACCESS_FINE_LOCATION` | `AndroidManifest.xml` | Manifest lists both; GPS button resolves a fix in a WebView build |
| H6 | `getCurrentPosition` timeout + error fallback everywhere | `app-bundle.js` (locations + init) | All 3 call sites pass `{timeout:10000,maximumAge:600000}` and have an error callback that shows ZIP-entry fallback |
| M1 | Skip SW registration on native Capacitor | `app-bundle.js` | Registration guarded by `!window.Capacitor?.isNativePlatform()`; SW cache version bumped |

## Phase 1 — Money & data safety (C2, H1, L2)

| ID | Fix | File(s) | Acceptance |
|----|-----|---------|-----------|
| C2 | Foreman: require Supabase session JWT (verify server-side), pin CORS to app origin, build system prompt server-side, per-user rate limit | `netlify/functions/foreman.js`; callers in `app-bundle.js` | Unauthenticated/other-origin request rejected 401/403; client-supplied `systemPrompt` ignored; >N/day per user → 429 |
| H1 | restore-pro: only honor the email in a verified session; drop free-text restore; rate-limit | `netlify/functions/restore-pro.js`; `app-bundle.js` settings | No entitlement granted without a session whose email matches the Stripe customer |
| L2 | Remove key-presence leak from Foreman GET | `netlify/functions/foreman.js` | GET no longer returns `keyPresent` |

**Env/dashboard dependencies** (John-only) are stubbed with `TODO(HUMAN)` + exact steps in `HUMAN_TASKS.md`: `SUPABASE_JWT_SECRET`/JWKS for server-side verification, and any rate-limit store.

## Phase 2 — Correctness & crash-proofing (H2, H3, H4, M4, M5, M6)

| ID | Fix | File | Acceptance |
|----|-----|------|-----------|
| H2 | Timezone: derive "now" and hour boundaries from Open-Meteo `utc_offset_seconds`, not device-local `new Date()` | `app-bundle.js` (`fetchWx` URL already returns offset; use it in `renderConditions`/hour filters) | Saved location in another tz shows correct current hour and "next 10 hours" |
| H3 | One shared `esc()` HTML-escape helper applied to the 3 sinks: Foreman answer, project site card (`projectName`/`gcContact`/`label`/`trade`), crew email | `app-bundle.js` | `<img src=x onerror>` in any of those fields renders inert |
| H4 | try/catch guards on every `JSON.parse` of persisted state | `app-bundle.js` | Corrupt `jw_locs`/`jw_notify`/`jw_foreman_usage`/project locs → safe default, no crash |
| M4 | `AbortController` timeout + `r.ok` check on function/API fetches | `app-bundle.js` | Hung request aborts ~12s with failure UI; error body not shown as an answer |
| M5 | Guard `Math.max(...[])` → 0 | `app-bundle.js` project rain calc | Empty probability array renders `0%`, never `-Infinity` |
| M6 | Wrap `setItem` on hot paths; toast on `QuotaExceededError` | `app-bundle.js` | Quota-full save surfaces a toast, no uncaught throw |

## Phase 3 — Reliability & offline (M2, M3, M9, M10)

| ID | Fix | File | Acceptance |
|----|-----|------|-----------|
| M2 | Vendor `supabase.min.js` into `js/`, load `defer` (no CDN dependency) | `index.html`, `js/vendor/` | No jsDelivr request at runtime; SW precaches it |
| M3 | Morning briefing: re-implement via SW notification if feasible in scope; else remove feature + its marketing copy and note it | `app-bundle.js`, `sw.js`, `index.html` SEO copy | Either fires reliably, or is fully removed with no dangling UI/claims |
| M9 | Undo affordance on severe-alert swipe/×-dismiss | `app-bundle.js`, `css/app.css` | Dismissing a severe event shows an undo toast that restores it |
| M10 | Allow city-name search (not ZIP-only); show "NWS: US only" note for non-US | `app-bundle.js`, `index.html` input | Typing a city resolves; non-US location shows coverage note instead of silent empty |

## Phase 4 — Accessibility & polish (H7, M8, L1, L3–L9)

| ID | Fix | File | Acceptance |
|----|-----|------|-----------|
| H7 | `aria-live`/`role=alert` on `#nwsAlerts`+`#alertBanner`; dialog semantics + focus trap + Escape on 3 modals; labels on `#locInput`/`#tradeSelect`/`#settingsBtn`; 44px min targets; `:focus-visible` styles | `index.html`, `css/app.css`, `app-bundle.js` | Screen reader announces alerts; modals escapable + labelled; controls ≥44px; visible keyboard focus |
| M8 | `--subtle` ≥0.60 alpha & ≥12px; visible control borders; `prefers-color-scheme: light` mode; `prefers-reduced-motion`; real select dropdown arrow | `css/app.css`, `index.html` | Contrast ≥4.5:1 at used sizes; motion respected; light mode legible in sun |
| L1 | Remove debug `console.log` (coords etc.) | `app-bundle.js` | No coordinate logging in production |
| L3 | Remove dead code (`saveNoteToSupabase`/`loadNotesFromSupabase`, `deleteLoc`, dup keydown, legacy foreman modal shims where safe) | `app-bundle.js` | No unreferenced functions reintroduced |
| L4 | De-dup where low-risk (note voice input, toast builders) | `app-bundle.js` | Behavior unchanged |
| L5 | Load actual Barlow font or drop the family reference | `index.html`/`css` | Declared fonts match loaded fonts |
| L6 | Associate label with `#tradeSelect` (covered by H7) | `index.html` | Lighthouse `select-name` passes |
| L7 | Remove leftover Capacitor template icon vectors | `android/.../res/drawable*` | Unreferenced template drawables gone |
| L8 | (Splash crop) — regen needs source art → HUMAN_TASKS | — | Filed |
| L9 | rem-based type scale w/ 13px floor (covered by M8) | `css/app.css` | Type scales with OS setting |

---

## Global validation checklist (run after each phase, all must pass before merge)

1. `node -c js/app-bundle.js` — bundle parses (no syntax error).
2. `npm run build:www` — succeeds; `www/js/app-bundle.js` hash == root.
3. `npx cap sync android` — succeeds; `android/.../assets/public/js/app-bundle.js` hash == root.
4. Manual smoke (documented in validation-run): ZIP search, GPS fallback, trade switch, day modal, forecast, Foreman gated, settings persist.
5. XSS probes (H3): malicious `projectName`, crew email, and a Foreman answer containing a tag render inert.
6. Corrupt-storage probe (H4): set `jw_locs='{'` → app still boots.
7. Lighthouse re-run: a11y and best-practices must not regress; target a11y ≥ 90.
8. AAB: `versionCode 6`; bundled `app-bundle.js` byte-matches post-fix root.
