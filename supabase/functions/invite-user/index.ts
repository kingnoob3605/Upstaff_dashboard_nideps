// supabase/functions/invite-user/index.ts
//
// Magic-link invite — admin-only.
//
// PURPOSE
//   Lets HR (role='hr') invite a new user by email. Generates a Supabase
//   magic-link via the admin API, then upserts a `profiles` row with the
//   chosen role. The invitee clicks the link and lands logged in.
//
// REQUEST
//   POST <invite-user URL>
//   Headers: Authorization: Bearer <inviter's supabase access_token>
//   Body:    JSON {
//     email:    string,
//     role:     'hr' | 'assistant',
//     name?:    string,
//     redirect?: string   // optional post-login redirect (must be allowlisted)
//   }
//
// RESPONSE
//   200 { result:'success', actionLink:string, expiresAt:string }
//   401 { result:'error',   message:'…' }
//   403 { result:'error',   message:'Not authorized.' }
//
// REQUIRED ENV
//   SUPABASE_URL                 — auto-injected
//   SUPABASE_SERVICE_ROLE_KEY    — must be set: `supabase secrets set …`
//   SUPABASE_ANON_KEY            — auto-injected (used only for caller verify)
//
// DEPLOY
//   supabase functions deploy invite-user --no-verify-jwt
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service role>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')              || '';
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')         || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const ALLOWED_ROLES = ['hr', 'assistant'] as const;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jr(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST')    return jr({ result: 'error', message: 'Method not allowed' }, 405);

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return jr({ result: 'error', message: 'Service role not configured.' }, 500);
  }

  // ── 1. Verify caller's JWT ──────────────────────────────────────────
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!auth) return jr({ result: 'error', message: 'Missing bearer token.' }, 401);

  const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: userData, error: userErr } = await sbAnon.auth.getUser(auth);
  if (userErr || !userData?.user) {
    return jr({ result: 'error', message: 'Invalid session.' }, 401);
  }

  // ── 2. Caller must be 'hr' ──────────────────────────────────────────
  const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: callerProfile } = await sbAdmin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();
  if (!callerProfile || callerProfile.role !== 'hr') {
    return jr({ result: 'error', message: 'Only HR can invite users.' }, 403);
  }

  // ── 3. Parse + validate body ────────────────────────────────────────
  let body: { email?: string; role?: string; name?: string; redirect?: string };
  try {
    body = await req.json();
  } catch (_) {
    return jr({ result: 'error', message: 'Invalid JSON.' }, 400);
  }
  const email = (body.email || '').trim().toLowerCase();
  const role  = (body.role  || '').trim();
  const name  = (body.name  || email.split('@')[0]).trim();
  if (!email || !email.includes('@')) {
    return jr({ result: 'error', message: 'Valid email required.' }, 400);
  }
  if (!ALLOWED_ROLES.includes(role as any)) {
    return jr({ result: 'error', message: 'Role must be hr or assistant.' }, 400);
  }

  // ── 4. Generate magic link via admin API ────────────────────────────
  const { data: linkData, error: linkErr } = await sbAdmin.auth.admin.generateLink({
    type:  'magiclink',
    email,
    options: body.redirect ? { redirectTo: body.redirect } : {},
  });
  if (linkErr || !linkData) {
    return jr({ result: 'error', message: linkErr?.message || 'Link generation failed.' }, 500);
  }

  // ── 5. Upsert profile row so the role exists when they log in ───────
  const newUserId = (linkData.user as any)?.id;
  if (newUserId) {
    await sbAdmin
      .from('profiles')
      .upsert(
        { id: newUserId, role, name },
        { onConflict: 'id' },
      );
  }

  // ── 6. Audit log ────────────────────────────────────────────────────
  try {
    await sbAdmin.from('audit_log').insert({
      user_id: userData.user.id,
      action:  'invite_user',
      detail:  { invited_email: email, invited_role: role },
    });
  } catch (_) { /* table may not exist yet — silent */ }

  return jr({
    result:    'success',
    actionLink: (linkData.properties as any)?.action_link || '',
    expiresAt: (linkData.properties as any)?.email_otp || '',
  });
});
