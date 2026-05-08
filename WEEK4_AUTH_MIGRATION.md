# Week 4 — Auth hardening (Phase 1)

## Goal

Stop shipping `adminPassword` from browser localStorage to Apps Script on
every request. Move credential injection server-side via a Supabase Edge
Function that validates the user's Supabase JWT before forwarding.

## What shipped (client + edge fn code)

- `supabase/functions/apps-script-proxy/index.ts` — Deno Edge Function.
  Validates Supabase JWT, looks up role in `profiles`, forwards body to
  Apps Script with server-side admin creds.
- `js/pm-ui-api.js` — `_post()` now branches on `useEdgeProxy` flag.
  When enabled, strips `email/password/adminPassword` from payload and
  attaches `Authorization: Bearer <supabaseToken>` instead.
- `isConfigured()` returns `true` in proxy mode without legacy creds.
- `silentReLogin()` short-circuits in proxy mode (Supabase JWT IS the session).

## Deploy steps (run by repo owner)

```bash
# 1. Install Supabase CLI if needed
npm install -g supabase

# 2. Link the project
supabase login
supabase link --project-ref pbabqydgzgrciqzidugd

# 3. Set secrets (env vars used by the edge fn)
supabase secrets set \
  APPS_SCRIPT_URL="https://script.google.com/.../exec" \
  APPS_SCRIPT_ADMIN_EMAIL="<admin@example.com>" \
  APPS_SCRIPT_ADMIN_PASSWORD="<the password>"

# 4. Deploy
supabase functions deploy apps-script-proxy --no-verify-jwt

# 5. Capture the deployed URL — looks like:
#    https://pbabqydgzgrciqzidugd.supabase.co/functions/v1/apps-script-proxy
```

## Enable proxy mode in the app

Open browser devtools and run:

```js
var c = JSON.parse(localStorage.getItem('upstaff_api_config') || '{}');
c.useEdgeProxy = true;
c.edgeProxyUrl = 'https://pbabqydgzgrciqzidugd.supabase.co/functions/v1/apps-script-proxy';
// Optional: scrub the now-unused legacy creds
delete c.adminPassword;
localStorage.setItem('upstaff_api_config', JSON.stringify(c));
location.reload();
```

A future Settings UI toggle should expose this without devtools.

## Verifying

1. After enabling proxy mode, run any sync action in the app.
2. Open Network tab — request URL should be the `/functions/v1/...` proxy,
   not Apps Script directly.
3. Inspect request body — must NOT contain `password` or `adminPassword`.
4. `Authorization` header must contain a Bearer token.
5. Logout, then attempt the sync — should fail with 401 from edge fn.

## Rollback

Set `c.useEdgeProxy = false` — `_post()` falls back to direct Apps Script.

## Phase 2 (not in this drop)

- Settings UI toggle for proxy mode
- Magic-link invite flow (admin-only) using Supabase admin API in edge fn
- Edge fn rate-limiting per user (deno-kv counter, 60 req/min)
- Audit log table (`audit_log`: user_id, action, ts, ip)
