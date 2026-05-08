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

## Phase 2 — shipped

- ✅ Settings UI toggle for proxy mode (Settings → 🛡️ Edge Function Proxy card)
- ✅ Magic-link invite flow (`supabase/functions/invite-user/`, HR-only UI card)
- ✅ Rate-limiting on apps-script-proxy (60 req/min/user via deno-kv)
- ✅ `audit_log` table migration (`supabase/migrations/20260508_audit_log.sql`)

### Phase 2 deploy steps

```bash
# Apply audit_log migration
supabase db push

# Set service role secret (separate key from anon key — find in dashboard → Settings → API)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"

# Deploy invite-user
supabase functions deploy invite-user --no-verify-jwt

# Re-deploy apps-script-proxy (now with rate-limit + audit hook)
supabase functions deploy apps-script-proxy --no-verify-jwt
```

### Using the invite UI

1. Sign in as an HR user.
2. Open Settings → ✉️ Invite User card (only visible for HR).
3. Paste the invite-user URL (e.g. `https://....supabase.co/functions/v1/invite-user`).
4. Fill email + name + role → click Generate Invite Link.
5. The link auto-copies to clipboard. Share via your preferred channel.

### Phase 3 backlog

- Audit-log writes from all sensitive actions (currently only `invite_user`)
- Per-IP rate-limit (additive to per-user)
- Token rotation on suspicious activity
- Admin dashboard view of `audit_log`
