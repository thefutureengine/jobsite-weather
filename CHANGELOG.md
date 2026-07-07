# Changelog

## 1.1.1 (versionCode 6) — 2026-07-06

### Play Store "What's new" (paste this)
```
Search by city name, not just ZIP. Accurate hourly timing for saved job sites in
other time zones. GPS now fails fast instead of hanging. Reliable morning briefing,
undo for dismissed severe-weather alerts, and big accessibility improvements (larger
buttons, higher contrast, screen-reader support). Plus security and stability
hardening under the hood.
```

### Fixed
- **GPS could hang forever** on desktop or a slow fix — it now times out in 10s and
  falls back to search, with a clear message. (H6)
- **Wrong "next hours" for saved sites in other time zones** — hourly timing is now
  computed from the location's own clock, not the phone's. (H2)
- **Location permission** is now declared, so the in-app GPS button works on Android. (H5)
- **Search accepts city names** ("Austin, TX"), not only 5-digit ZIPs. (M10)
- **Morning briefing now actually fires** (as an on-open recap) instead of silently
  never running. (M3)
- **Undo** when you dismiss a severe-weather alert by accident. (M9)
- **Non-US locations** show a clear "severe alerts cover the US only" note instead of
  silently nothing. (M10)
- Corrupt local data no longer prevents the app from opening. (H4)
- Weather/AI requests can no longer hang the screen indefinitely. (M4)

### Added
- **Light mode** — a manual toggle in Settings ("Appearance → Light mode") for
  readability in direct sun. Every color meets WCAG AA contrast in both themes.
- Higher text contrast, reduced-motion support, larger touch targets, screen-reader
  labels and live regions, and visible keyboard focus. (H7, M8)

### Fixed (follow-ups)
- Night hours now show a **moon** for clear/partly-clear skies instead of a sun
  (hourly strip, current conditions, and the day detail).

### Security & reliability (under the hood)
- Ask-the-Foreman AI endpoint hardened: the prompt is built server-side, inputs are
  validated and size-capped, CORS is locked to the app's origins, and requests are
  rate-limited — closing an unauthenticated abuse path on the AI key. (C2)
- "Restore Pro" now verifies you own the email via your signed-in session instead of
  trusting any typed address. (H1)
- Removed a diagnostic endpoint response and cross-site XSS exposure in AI answers,
  crew invites, job-site names, and weather-alert text. (H3, L2)
- Supabase library is now bundled with the app (no third-party CDN dependency), and
  the service worker no longer risks serving stale builds inside the Android app. (M1, M2)
- Auth tokens are excluded from device/cloud backup. (allowBackup=false)

### Notes
- Web PWA (`jobsiteweather.app`) and the Play app ship from the same web bundle, so
  these fixes reach both on release.
- See `HUMAN_TASKS.md` for the signing/upload/deploy steps and one product decision
  (true push-based 5AM briefing).
