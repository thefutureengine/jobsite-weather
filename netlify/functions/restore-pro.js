// Restore Pro — proves the caller OWNS the email before granting entitlement.
// Hardened (audit H1): the email is taken from a VERIFIED Supabase session token
// (via GET /auth/v1/user), never from the request body. This closes the bypass
// where anyone could type a paying customer's address to unlock Pro, and removes
// the email-enumeration surface. CORS is pinned to known origins.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jfpyrlregzwmvltrhgfq.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcHlybHJlZ3p3bXZsdHJoZ2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzcyOTMsImV4cCI6MjA5MDgxMzI5M30.YDLYIk4n6X7mBYYpk5fkEe0MeS3KqrB4wDhcwmD5iKs';

const ALLOWED_ORIGINS = new Set([
  'https://jobsiteweather.app',
  'https://www.jobsiteweather.app',
  'https://localhost',
  'capacitor://localhost',
  'http://localhost:8888'
]);

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

async function verifiedEmail(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` }
    });
    if (!r.ok) return null;
    const u = await r.json();
    return (u && u.email) ? u.email.trim().toLowerCase() : null;
  } catch (e) { return null; }
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  const CORS = corsFor(origin);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: 'Method not allowed' };

  // Ownership proof: the email comes from the verified session, not the body.
  const email = await verifiedEmail(event.headers.authorization || event.headers.Authorization);
  if (!email) {
    return {
      statusCode: 401,
      headers: CORS,
      body: JSON.stringify({ success: false, message: 'Sign in to restore Pro — we verify the email on your account.' })
    };
  }

  try {
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
      { headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const stripeData = await stripeResponse.json();
    const customer = stripeData.data?.[0];
    if (!customer) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: false, message: 'No account found for your email.' }) };
    }

    const subResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=active&limit=1`,
      { headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
    );
    const subData = await subResponse.json();
    const hasActiveSub = subData.data?.length > 0;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify(hasActiveSub
        ? { success: true, message: 'Pro restored successfully.' }
        : { success: false, message: 'No active Pro subscription found for your account.' })
    };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, message: 'Could not verify. Try again.' }) };
  }
};
