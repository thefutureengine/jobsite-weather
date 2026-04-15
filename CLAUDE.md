# JobSite Weather 

## Before doing ANYTHING
1. Confirm you are in `C:\Users\John\Desktop\jobsite-weather`
2. Confirm you are on the `dev` branch
3. Read `index.html` and `js/app.js` before touching anything

## Non-negotiable rules
- NEVER commit to `main` without explicit instruction
- ALL new work goes to `dev` branch only
- Only hotfixes go to `main` — state exactly which files before committing
- After any `main` commit — test `jobsiteweather.app` immediately
- One fix at a time — confirm working before moving to next fix
- Never rebuild working functionality — surgical changes only

## Architecture
- Source: `C:\Users\John\Desktop\jobsite-weather`
- Live site: `jobsiteweather.app` (Netlify, auto-deploys from `main`)
- Dev preview: Netlify dev branch URL
- JS files: `js/` folder — modular structure
- Netlify functions: `netlify/functions/`
- Supabase: `jfpyrlregzwmvltrhgfq.supabase.co`

## Deploy process
- Dev: commit and push to `dev` branch — Netlify auto-deploys preview
- Production: merge `dev` to `main` only when John approves
- Never use manual zip deploys — GitHub handles everything now
