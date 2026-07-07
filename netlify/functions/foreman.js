// Ask the Foreman — server-side LLM proxy.
// Hardened (audit C2/L2): the system prompt is built HERE from a fixed template;
// the client can only supply DATA (question, name, trade, conditions), never
// instructions. CORS is pinned to known origins, inputs are size-capped, the
// key-presence GET probe is removed, and requests are rate-limited per identity
// (verified Supabase user) or per IP (anonymous), best-effort via Netlify Blobs.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jfpyrlregzwmvltrhgfq.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcHlybHJlZ3p3bXZsdHJoZ2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzcyOTMsImV4cCI6MjA5MDgxMzI5M30.YDLYIk4n6X7mBYYpk5fkEe0MeS3KqrB4wDhcwmD5iKs';

const ALLOWED_ORIGINS = new Set([
  'https://jobsiteweather.app',
  'https://www.jobsiteweather.app',
  'https://localhost',       // Capacitor Android (androidScheme https)
  'capacitor://localhost',   // Capacitor iOS
  'http://localhost:8888'    // netlify dev
]);

const ANON_DAILY_CAP = 30;   // generous backstop; client UX still shows 7/day
const AUTH_DAILY_CAP = 150;
const MAX_QUESTION = 500;
const MAX_NOTES = 6000;
const MAX_CONDITIONS = 800;

const STYLE = {
  shooter: 'Be direct and blunt. No fluff. Real numbers, real advice. Brief.',
  light: 'Be direct but add dry jobsite humor. Keep it real but make them smile.',
  facts: 'Be purely factual. Numbers and times only, minimal commentary.'
};

function corsFor(origin) {
  const h = {
    'Content-Type': 'application/json',
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function sanitize(s, max) { return typeof s === 'string' ? s.slice(0, max) : ''; }

async function verifyUser(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` }
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch (e) { return null; }
}

// Best-effort per-identity daily limiter. Fails OPEN if no durable store is
// available (see HUMAN_TASKS for the durable-store recommendation).
async function underLimit(key, cap) {
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('foreman-ratelimit');
    const id = `${new Date().toISOString().slice(0, 10)}:${key}`;
    const cur = parseInt((await store.get(id)) || '0', 10) || 0;
    if (cur >= cap) return false;
    await store.set(id, String(cur + 1));
    return true;
  } catch (e) { return true; }
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  const CORS = corsFor(origin);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ answer: 'Method not allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers: CORS, body: JSON.stringify({ answer: 'Bad request.' }) }; }

  const user = await verifyUser(event.headers.authorization || event.headers.Authorization);
  const ip = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'unknown';
  const rlKey = user ? `u:${user.id}` : `ip:${ip}`;
  const cap = user ? AUTH_DAILY_CAP : ANON_DAILY_CAP;
  if (!(await underLimit(rlKey, cap))) {
    return { statusCode: 429, headers: CORS, body: JSON.stringify({ answer: "Easy — you've hit the Foreman's limit for today. Back at it tomorrow." }) };
  }

  const name = sanitize(body.name, 40) || 'Boss';
  const tradeName = sanitize(body.tradeName, 40) || 'General';
  const label = sanitize(body.label, 80);
  const mode = body.mode === 'summary' ? 'summary' : 'advice';

  let system, question, maxTokens;
  if (mode === 'summary') {
    const notesText = sanitize(body.notesText, MAX_NOTES);
    if (!notesText) return { statusCode: 400, headers: CORS, body: JSON.stringify({ answer: 'No notes to summarize.' }) };
    system = `You are a seasoned jobsite foreman with 30 years in the trades working for StrickerCo Solutions. You are reviewing job site notes for ${name}, a ${tradeName}.\n\nSummarize these notes in plain English — weather patterns, recurring issues, best working windows, notable delays, and the overall site weather story so far. Be specific, use the dates. Keep it under 100 words. Sound like a foreman talking to another foreman, not a report.\n\nJob site: ${label}\nNotes:\n${notesText}`;
    question = `Summarize the weather and site conditions history for ${label} based on these notes.`;
    maxTokens = 220;
  } else {
    question = sanitize(body.question, MAX_QUESTION);
    if (!question) return { statusCode: 400, headers: CORS, body: JSON.stringify({ answer: 'Ask the Foreman a question.' }) };
    const style = STYLE[body.style] ? body.style : 'shooter';
    const conditions = sanitize(body.conditions, MAX_CONDITIONS);
    system = `You are a seasoned jobsite foreman with 30 years in the trades. You work for StrickerCo Solutions. You're talking to ${name}, a ${tradeName} worker.\n\nStyle: ${STYLE[style]}\n\nOccasionally — not every response — weave in a short piece of field wisdom. Things like: "The way you do one thing is the way you do everything." Keep it subtle, never preachy.\n\nKeep ALL answers under 80 words. Use ${name}'s name once naturally. Be specific — use actual numbers from the conditions.\n\nCurrent conditions at ${label}: ${conditions}`;
    maxTokens = 150;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ answer: "Foreman's radio is down right now." }) };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: question }]
      })
    });
    if (!response.ok) {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ answer: "Foreman's off the grid right now." }) };
    }
    const data = await response.json();
    const answer = data.content?.[0]?.text || "Can't reach the foreman right now.";
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ answer }) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ answer: "Foreman's off the grid right now." }) };
  }
};
