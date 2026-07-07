# HUMAN_TASKS — JobSite Weather 1.1.1

Actions only you can perform (dashboard access, physical uploads, or product decisions).
Ordered by priority. Everything else in the audit is already implemented on branch
`fix/audit-1.1.1`.

---

## 1. Sign & upload the AAB to Play (unblocks C1 — required)

The build has no committed signing config (by design — the keystore isn't in the
repo), so the Gradle output is **unsigned**. To ship:

**Option A — Android Studio (matches your current flow):**
1. Open `android/` in Android Studio.
2. `Build ▸ Generate Signed App Bundle ▸ Android App Bundle`.
3. Select your existing upload keystore (the one used for versionCode 5).
4. Build variant `release`. Output: a signed `.aab`.
5. Play Console ▸ JobSite Weather ▸ Production ▸ Create new release ▸ upload the
   signed AAB (versionCode **6**, versionName **1.1.1**).
6. Paste the `CHANGELOG.md` 1.1.1 entry into "What's new".

**Option B — command line:** provide the keystore + passwords and I can wire a
`signingConfigs.release` block so `./gradlew bundleRelease` emits a signed AAB.
Do NOT commit the keystore or passwords — use `~/.gradle/gradle.properties` or env
vars (`JW_UPLOAD_STORE_FILE`, `JW_UPLOAD_STORE_PASSWORD`, `JW_UPLOAD_KEY_ALIAS`,
`JW_UPLOAD_KEY_PASSWORD`).

Also confirm the new **location permission** is declared in the Play Console Data
Safety form (Approximate + Precise location, used for on-device weather; not shared).

> Verified for you: the unsigned AAB bundles the post-fix web assets
> (`app-bundle.js` in the APK == post-fix source, hash-matched), so once signed it
> carries every 1.1.1 fix.

## 2. Deploy the web app (unblocks the PWA half of C1)

Merge `fix/audit-1.1.1` → `main` (I can do this on your go) so Netlify redeploys
`jobsiteweather.app`. The web PWA and the Play app share the same web bundle, so
this ships the same fixes to browser/installed-PWA users immediately.

After deploy, hard-check `jobsiteweather.app`: ZIP search, city search (e.g.
"Austin, TX"), GPS, trade switch, Ask the Foreman.

## 3. Netlify environment variables (needed for C2 / H1 hardening to fully work)

The hardened functions read these from `process.env`. Set them in
**Netlify ▸ Site settings ▸ Environment variables** if not already present:

| Var | Used by | Notes |
|-----|---------|-------|
| `ANTHROPIC_API_KEY` | foreman | already set (existing) |
| `STRIPE_SECRET_KEY` | restore-pro | already set (existing) |
| `TOMORROW_KEY` | storm-forecast | already set (existing) |
| `SUPABASE_URL` | foreman, restore-pro | optional — code falls back to the public project URL |
| `SUPABASE_ANON_KEY` | foreman, restore-pro | optional — code falls back to the public anon key |

No new secret is strictly required: token verification uses Supabase's public
`/auth/v1/user` endpoint with the anon key, so H1/C2 work without a dashboard step.

## 4. Confirm the Foreman rate-limit store (hardens C2 further — recommended)

The per-user / per-IP daily limiter uses **Netlify Blobs**, which is auto-provisioned
on Netlify production — no action needed there. It **fails open** if the store is
unavailable (e.g. some local/dev contexts), so the request still succeeds but isn't
counted. If you want a hard guarantee under attack, provision a durable store
(Upstash Redis is the usual choice) and tell me — I'll swap the limiter backend.
Server-side prompt construction + input caps already remove the "free LLM / arbitrary
prompt" abuse regardless of the limiter.

## 5. Product decision — true 5AM push briefing (M3)

The "morning briefing" now fires reliably **when the crew opens the app in the
morning** (the old 5AM `setTimeout` never survived a closed tab, so it effectively
never fired). A guaranteed 5:00 AM *push* while the app is closed needs Web Push:
a service-worker push handler, VAPID keys, a subscription table, and a scheduled
sender (cron). If you want that, say so and I'll scope it — it's a backend feature,
not a one-file change. Marketing copy has been changed from "5AM nudge" to the honest
"morning briefing."

## 6. Light mode — DONE (manual toggle shipped)

Built as a manual **Settings → Appearance → Light mode** toggle (per your call), using
split `--accent` (background) + `--on-accent` (text-on-accent) tokens so both themes
clear WCAG AA. Verified: all 12 key color pairs ≥ 4.5:1, including the accent-as-text
(5.67:1) and white-on-accent-button (5.67:1) cases that broke the first attempt.
Nothing for you here — noted for completeness.

## 7. Splash screen art (L8 — cosmetic)

`android/app/src/main/res/drawable*/splash.png` bakes in a "JOBSITE" wordmark that is
edge-cropped on some aspect ratios. Regenerate from a source with more padding and
drop the new PNGs in (I can wire them once you provide the art).

---

## Deferred (intentionally not changed — flagged, not fixed)

- **L4 (duplicate voice-input / toast builders):** behavior-neutral dedup; left as-is
  to avoid regression risk in a release focused on correctness. Safe to do later.
- **L7 (leftover Capacitor template icon vectors):** `drawable/ic_launcher_background.xml`
  + `drawable-v24/ic_launcher_foreground.xml` are unreferenced, but deleting Android
  resources risks the build for zero user benefit — left in place.
- **Modal focus-trap (H7):** modals now have `role=dialog`/`aria-modal`, Escape works,
  and overlay-click closes. A full focus trap (tab-cycling inside the open modal) was
  not added; it's a refinement, not a blocker.
- **Source-module divergence:** `js/*.js` modules are stale vs the shipped
  `js/app-bundle.js` (there is no committed bundler). All fixes went into the
  authoritative bundle. Recommend establishing a real build step (e.g. concatenate
  `js/*.js` → `app-bundle.js`) so the two stop drifting; I can set that up.
