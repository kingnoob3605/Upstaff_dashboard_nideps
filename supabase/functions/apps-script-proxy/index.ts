// supabase/functions/apps-script-proxy/index.ts
//
// Apps Script proxy — server-side credential injection.
//
// PURPOSE
//   The legacy flow ships `adminEmail` + `adminPassword` from the browser to
//   Apps Script on every request. Anyone with localStorage access can read
//   them. This Edge Function holds those credentials in env vars, validates
//   the caller's Supabase JWT, and forwards the request to Apps Script.
//
// REQUEST CONTRACT (from browser)
//   POST <edgeProxyUrl>
//   Headers: Authorization: Bearer <supabase access_token>
//   Body:    JSON { action: string, ...payload }   // NO email/password
//
// RESPONSE
//   Whatever Apps Script returns (proxied verbatim).
//
// REQUIRED ENV VARS (set via `supabase secrets set`)
//   APPS_SCRIPT_URL              — full https://script.google.com/.../exec
//   APPS_SCRIPT_ADMIN_EMAIL      — service account email registered in script
//   APPS_SCRIPT_ADMIN_PASSWORD   — paired password
//   SUPABASE_URL                 — auto-injected by Supabase runtime
//   SUPABASE_ANON_KEY            — auto-injected by Supabase runtime
//
// DEPLOY
//   supabase functions deploy apps-script-proxy --no-verify-jwt
//   supabase secrets set APPS_SCRIPT_URL=… APPS_SCRIPT_ADMIN_EMAIL=… APPS_SCRIPT_ADMIN_PASSWORD=…
//
// We pass --no-verify-jwt so we control 401s ourselves (clearer error to UI).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const APPS_SCRIPT_URL            = Deno.env.get('APPS_SCRIPT_URL')            || '';
const APPS_SCRIPT_ADMIN_EMAIL    = Deno.env.get('APPS_SCRIPT_ADMIN_EMAIL')    || '';
const APPS_SCRIPT_ADMIN_PASSWORD = Deno.env.get('APPS_SCRIPT_ADMIN_PASSWORD') || '';
const SUPABASE_URL               = Deno.env.get('SUPABASE_URL')               || '';
const SUPABASE_ANON_KEY          = Deno.env.get('SUPABASE_ANON_KEY')          || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ result: 'error', message: 'Method not allowed' }, 405);
  }

  if (!APPS_SCRIPT_URL || !APPS_SCRIPT_ADMIN_EMAIL || !APPS_SCRIPT_ADMIN_PASSWORD) {
    return jsonResponse(
      { result: 'error', message: 'Proxy not fully configured (missing env vars).' },
      500,
    );
  }

  // ── 1. Validate Supabase JWT ──────────────────────────────────────────
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return jsonResponse({ result: 'error', message: 'Missing bearer token.' }, 401);
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userData?.user) {
    return jsonResponse({ result: 'error', message: 'Invalid or expired session.' }, 401);
  }

  // Optional: enforce role check via profiles table
  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();
  if (!profile || !['hr', 'assistant'].includes(profile.role)) {
    return jsonResponse({ result: 'error', message: 'No assigned role.' }, 403);
  }

  // ── 2. Parse client body ──────────────────────────────────────────────
  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch (_) {
    return jsonResponse({ result: 'error', message: 'Invalid JSON body.' }, 400);
  }

  // Strip any client-supplied creds — server is the only source of truth.
  delete (payload as any).password;
  delete (payload as any).adminPassword;

  // ── 3. Inject server creds + forward ──────────────────────────────────
  const upstreamBody = {
    ...payload,
    email:       APPS_SCRIPT_ADMIN_EMAIL,
    password:    APPS_SCRIPT_ADMIN_PASSWORD,
    googleEmail: userData.user.email || '',
  };

  let upstreamResp: Response;
  try {
    upstreamResp = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(upstreamBody),
    });
  } catch (e) {
    return jsonResponse(
      { result: 'error', message: `Upstream fetch failed: ${(e as Error).message}` },
      502,
    );
  }

  const upstreamText = await upstreamResp.text();
  return new Response(upstreamText, {
    status:  upstreamResp.status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': upstreamResp.headers.get('content-type') || 'application/json',
    },
  });
});
