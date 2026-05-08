// js/supabase-auth.js
// ══════════════════════════════════════════════════════════════════
// Supabase Authentication Module
// Replaces Google Sign-In with Supabase email/password login.
//
// Required Supabase table:
//   profiles (
//     id   uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
//     role text NOT NULL CHECK (role IN ('hr', 'assistant')),
//     name text NOT NULL
//   )
//
// Roles are assigned by an admin — users cannot choose their own role.
// ══════════════════════════════════════════════════════════════════

window.SupabaseAuth = (function () {
  const CONFIG_KEY = 'upstaff_api_config';

  const DEFAULT_URL = 'https://pbabqydgzgrciqzidugd.supabase.co';
  const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiYWJxeWRnemdyY2lxemlkdWdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzEyMTMsImV4cCI6MjA5MTg0NzIxM30.-V7A3KVdA2KyrIjH0jz7PpSGfHo91wTllFy_LxMi-Zg';

  function _config() {
    try {
      var c = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
      if (!c.supabaseUrl)     c.supabaseUrl     = DEFAULT_URL;
      if (!c.supabaseAnonKey) c.supabaseAnonKey = DEFAULT_KEY;
      return c;
    }
    catch (_) { return { supabaseUrl: DEFAULT_URL, supabaseAnonKey: DEFAULT_KEY }; }
  }

  function _saveConfig(c) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
  }

  var _client = null;

  function _getClient() {
    if (_client) return _client;
    var c = _config();
    if (!c.supabaseUrl || !c.supabaseAnonKey) return null;
    if (!window.supabase) {
      console.error('[SupabaseAuth] @supabase/supabase-js not loaded.');
      return null;
    }
    _client = window.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'implicit',
      },
    });
    return _client;
  }

  // Force client init + wait briefly for the URL-hash session to be
  // picked up. Used by the password-recovery flow because the modal
  // opens before any other code touches Supabase, so we need to make
  // sure detectSessionInUrl has a chance to run.
  async function ensureRecoverySession() {
    var client = _getClient();
    if (!client) throw new Error('Supabase not configured.');

    // Already attached?
    var first = await client.auth.getSession();
    if (first.data && first.data.session) return first.data.session;

    // Manually parse the hash and set the session — works even if the
    // client missed the auto-detect window (some browsers / SPA hosts).
    var hash = (window.location.hash || '').replace(/^#/, '');
    if (!hash) throw new Error('Auth session missing!');
    var params = {};
    hash.split('&').forEach(function(p) {
      var i = p.indexOf('=');
      if (i > -1) params[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1));
    });
    if (!params.access_token || !params.refresh_token) {
      throw new Error('Recovery link is missing tokens. Request a new reset email.');
    }
    var { data, error } = await client.auth.setSession({
      access_token:  params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw new Error(error.message);
    return data.session;
  }

  // ── Public API ────────────────────────────────────────────────

  function isConfigured() {
    var c = _config();
    return !!(c.supabaseUrl && c.supabaseAnonKey);
  }

  function isLoggedIn() {
    var c = _config();
    if (!c.supabaseToken || !c.login_at) return false;
    // Sessions expire after 30 days; Supabase JWTs expire sooner but
    // we treat the stored flag as the gate — a real token refresh flow
    // can be added later with onAuthStateChange.
    return Date.now() - c.login_at < 30 * 24 * 60 * 60 * 1000;
  }

  function getRole()  { return _config().role  || 'assistant'; }
  function getName()  { return _config().name  || ''; }
  function getEmail() { return _config().email || ''; }

  // Send a one-time magic-link to the given email. Supabase emails it
  // automatically. Recipient clicks → returns to app with session in URL hash.
  async function sendMagicLink(email) {
    var client = _getClient();
    if (!client) throw new Error('Supabase not configured.');
    var clean = (email || '').trim().toLowerCase();
    if (!clean || !clean.includes('@')) throw new Error('Enter a valid email.');
    var { error } = await client.auth.signInWithOtp({
      email: clean,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
        shouldCreateUser: true,
      },
    });
    if (error) throw new Error(error.message);
    return true;
  }

  // Called on page load. If Supabase auto-detected a session in the URL hash
  // (magic-link callback), finish wiring it up like a normal login.
  async function handleMagicLinkCallback() {
    var client = _getClient();
    if (!client) return null;
    var { data: { session } } = await client.auth.getSession();
    if (!session) return null;
    var c = _config();
    if (c.supabaseToken === session.access_token && c.login_at) return null;

    var fallbackName = (session.user.email || '').split('@')[0];
    var { data: profile, error: profileErr } = await client
      .from('profiles')
      .select('role, name')
      .eq('id', session.user.id)
      .single();

    if (profileErr || !profile) {
      // Check for a pending invite stashed by HR (sendMemberInvite). If
      // present, use the role/name HR chose; otherwise default to assistant.
      var inviteRole = 'assistant';
      var inviteName = fallbackName;
      try {
        var pending = JSON.parse(localStorage.getItem('upstaff_pending_invites') || '{}');
        var entry = pending[session.user.email];
        if (entry) {
          if (entry.role) inviteRole = entry.role;
          if (entry.name) inviteName = entry.name;
          delete pending[session.user.email];
          localStorage.setItem('upstaff_pending_invites', JSON.stringify(pending));
        }
      } catch (_) {}

      var { data: created, error: insertErr } = await client
        .from('profiles')
        .upsert({ id: session.user.id, role: inviteRole, name: inviteName },
                { onConflict: 'id' })
        .select('role, name')
        .single();
      if (insertErr || !created) {
        await client.auth.signOut();
        throw new Error('Profile setup failed. Contact your administrator.');
      }
      profile = created;
    }

    c.supabaseToken        = session.access_token;
    c.supabaseRefreshToken = session.refresh_token;
    c.email                = session.user.email;
    c.userId               = session.user.id;
    c.role                 = profile.role;
    c.name                 = profile.name || fallbackName;
    c.login_at             = Date.now();
    delete c.loggedOut;
    _saveConfig(c);

    await _fetchAndApplyConfig(session.access_token);
    var freshCfg = _config();
    if (freshCfg.webAppUrl && freshCfg.adminEmail && freshCfg.adminPassword) {
      await _fetchAppScriptToken(freshCfg);
    }

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return { role: profile.role, name: profile.name };
  }

  async function login(email, password) {
    var client = _getClient();
    if (!client) throw new Error('Supabase not configured. Click ⚙ Change settings below.');

    var { data, error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });
    if (error) throw new Error(error.message);

    // Fetch role + display name from the profiles table
    var { data: profile, error: profileErr } = await client
      .from('profiles')
      .select('role, name')
      .eq('id', data.user.id)
      .single();

    if (profileErr || !profile) {
      await client.auth.signOut();
      throw new Error('Account not set up. Contact your administrator.');
    }

    // Persist session in localStorage alongside existing config
    var c = _config();
    c.supabaseToken        = data.session.access_token;
    c.supabaseRefreshToken = data.session.refresh_token;
    c.email                = data.user.email;
    c.userId               = data.user.id;
    c.role                 = profile.role;
    c.name                 = profile.name || data.user.email.split('@')[0];
    c.login_at             = Date.now();
    delete c.loggedOut;
    _saveConfig(c);

    // Fetch all config keys from Supabase and apply them first
    await _fetchAndApplyConfig(data.session.access_token);

    // Only fetch Apps Script token if credentials were successfully loaded
    var freshCfg = _config();
    if (freshCfg.webAppUrl && freshCfg.adminEmail && freshCfg.adminPassword) {
      await _fetchAppScriptToken(freshCfg);
    }

    return { role: profile.role, name: profile.name };
  }

  // Fetch all keys from the `config` table and store them in localStorage
  async function _fetchAndApplyConfig(accessToken) {
    var c = _config();
    if (!c.supabaseUrl || !c.supabaseAnonKey) return;
    try {
      var resp = await fetch(c.supabaseUrl + '/rest/v1/config?select=key,value', {
        headers: {
          'apikey':        c.supabaseAnonKey,
          'Authorization': 'Bearer ' + accessToken,
        },
      });
      if (!resp.ok) {
        console.error('[SupabaseAuth] Config fetch failed: ' + resp.status + ' ' + resp.statusText);
        return;
      }
      var rows = await resp.json();
      if (!Array.isArray(rows)) {
        console.warn('[SupabaseAuth] Config fetch returned unexpected data:', rows);
        return;
      }

      // Map rows into a lookup object
      var map = {};
      rows.forEach(function(r) { map[r.key] = r.value; });

      // Apply Apps Script data source credentials
      if (map.apps_script_url) c.webAppUrl      = map.apps_script_url;
      if (map.admin_email)     c.adminEmail      = map.admin_email;
      if (map.admin_password)  c.adminPassword   = map.admin_password;

      // Apply Google Calendar config
      var gcal = {};
      try { gcal = JSON.parse(localStorage.getItem('upstaff_gcal_api_config') || '{}'); } catch(_) {}
      if (map.gcal_api_key)   gcal.apiKey   = map.gcal_api_key;
      if (map.gcal_client_id) gcal.clientId = map.gcal_client_id;
      localStorage.setItem('upstaff_gcal_api_config', JSON.stringify(gcal));

      // Apply EmailJS config
      var ejs = {};
      try { ejs = JSON.parse(localStorage.getItem('upstaff_emailjs_config') || '{}'); } catch(_) {}
      if (map.emailjs_service_id)  ejs.serviceId  = map.emailjs_service_id;
      if (map.emailjs_template_id) ejs.templateId = map.emailjs_template_id;
      if (map.emailjs_public_key)  ejs.publicKey  = map.emailjs_public_key;
      localStorage.setItem('upstaff_emailjs_config', JSON.stringify(ejs));

      // Apply search API key
      if (map.search_api_key) c.searchApiKey = map.search_api_key;

      _saveConfig(c);
    } catch (_) {}
  }

  // After Supabase login, call Apps Script login to get a data token.
  // Uses the webAppUrl + adminEmail + adminPassword stored in settings.
  async function _fetchAppScriptToken(c) {
    c = c || _config();
    if (!c.webAppUrl || !c.adminEmail || !c.adminPassword) return;
    try {
      var resp = await fetch(c.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action:      'login',
          email:       c.adminEmail,
          password:    c.adminPassword,
          googleEmail: c.email || '',   // Supabase user email — checked against ALLOWED_USERS
        }),
      });
      if (!resp.ok) return;
      var json = await resp.json();
      if (json.result === 'success' && json.token) {
        c.token = json.token;
        _saveConfig(c);
      }
    } catch (_) {}
  }

  async function logout() {
    var client = _getClient();
    if (client) { try { await client.auth.signOut(); } catch (_) {} }
    var c = _config();
    delete c.supabaseToken;
    delete c.supabaseRefreshToken;
    delete c.token;
    delete c.login_at;
    delete c.role;
    delete c.name;
    delete c.email;
    c.loggedOut = true;
    _saveConfig(c);
  }

  function saveSettings(supabaseUrl, supabaseAnonKey) {
    var c = _config();
    c.supabaseUrl     = supabaseUrl.trim();
    c.supabaseAnonKey = supabaseAnonKey.trim();
    _saveConfig(c);
  }

  // Change password for the currently logged-in user
  async function changePassword(newPassword) {
    var client = _getClient();
    if (!client) throw new Error('Not connected to Supabase.');
    var { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }

  // Send password reset email (works even when logged out)
  // Client-side throttle: 60s cooldown per email to slow user-enumeration attacks.
  // Real rate-limiting must happen server-side (Supabase auth has built-in limits).
  var _resetCooldownMs = 60 * 1000;
  var _resetCooldownKey = 'upstaff_pwreset_cooldown';
  function _readCooldownMap() {
    try { return JSON.parse(localStorage.getItem(_resetCooldownKey) || '{}'); }
    catch (_) { return {}; }
  }
  async function sendPasswordReset(email) {
    var client = _getClient();
    if (!client) throw new Error('Not connected to Supabase.');
    var addr = email.trim().toLowerCase();
    if (!addr) throw new Error('Email required.');

    var map = _readCooldownMap();
    var lastTs = map[addr] || 0;
    var waitMs = _resetCooldownMs - (Date.now() - lastTs);
    if (waitMs > 0) {
      throw new Error('Please wait ' + Math.ceil(waitMs / 1000) + 's before requesting another reset.');
    }

    // Pin to origin + path so the email never bakes in a stale URL hash
    // (e.g. an old #error=... fragment from a previous attempt) or a path
    // that points to a paused old host. The Supabase dashboard's
    // Site URL / Redirect URLs allowlist is still the ultimate gate.
    var redirectTo = window.location.origin + window.location.pathname;
    var { error } = await client.auth.resetPasswordForEmail(addr, {
      redirectTo: redirectTo,
    });
    if (error) throw new Error(error.message);

    map[addr] = Date.now();
    try { localStorage.setItem(_resetCooldownKey, JSON.stringify(map)); } catch (_) {}
  }

  function _jwtExpired(token) {
    try {
      var payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return Date.now() / 1000 > payload.exp;
    } catch (_) { return true; }
  }

  // Return a valid access token, refreshing silently if the current one has expired.
  async function _getFreshToken() {
    var c = _config();
    if (!c.supabaseToken) return null;
    if (!_jwtExpired(c.supabaseToken)) return c.supabaseToken;

    // Token expired — try refresh
    if (!c.supabaseRefreshToken) return null;
    try {
      var client = _getClient();
      if (!client) return null;
      var result = await client.auth.refreshSession({ refresh_token: c.supabaseRefreshToken });
      if (result.error || !result.data || !result.data.session) return null;
      c.supabaseToken        = result.data.session.access_token;
      c.supabaseRefreshToken = result.data.session.refresh_token;
      c.login_at             = Date.now();
      _saveConfig(c);
      return c.supabaseToken;
    } catch (_) { return null; }
  }

  // Fetch all profiles (HR sees all via RLS policy; assistants see only own)
  async function getMembers() {
    var c = _config();
    if (!c.supabaseUrl || !c.supabaseAnonKey) return [];
    var token = await _getFreshToken();
    if (!token) return [];
    try {
      var resp = await fetch(c.supabaseUrl + '/rest/v1/profiles?select=id,role,name,email&order=role.asc,name.asc', {
        headers: { 'apikey': c.supabaseAnonKey, 'Authorization': 'Bearer ' + token },
      });
      if (!resp.ok) return [];
      return await resp.json();
    } catch (_) { return []; }
  }

  // Create a new member via the invite-member Edge Function (HR sets password directly)
  async function inviteMember(email, role, name, password) {
    var c = _config();
    if (!c.supabaseUrl || !c.supabaseToken) throw new Error('Not logged in.');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.');
    var resp = await fetch(c.supabaseUrl + '/functions/v1/invite-member', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + c.supabaseToken,
        'apikey': c.supabaseAnonKey,
      },
      body: JSON.stringify({
        email:    email.trim().toLowerCase(),
        role,
        name:     name || email.split('@')[0],
        password,
      }),
    });
    var json = await resp.json();
    if (!resp.ok) throw new Error(json.error || 'Failed to create account.');
    return json;
  }

  // Remove a member by deleting their profiles row (blocks login; HR only via RLS)
  async function removeMember(memberId) {
    var client = _getClient();
    if (!client) throw new Error('Not connected to Supabase.');
    var { error } = await client.from('profiles').delete().eq('id', memberId);
    if (error) throw new Error(error.message);
  }

  function getCurrentUserId() { return _config().userId || null; }

  return { login, logout, isConfigured, isLoggedIn, getRole, getName, getEmail, saveSettings,
           changePassword, sendPasswordReset, getMembers, inviteMember, removeMember,
           getCurrentUserId, getFreshToken: _getFreshToken,
           sendMagicLink, handleMagicLinkCallback, ensureRecoverySession };
})();
