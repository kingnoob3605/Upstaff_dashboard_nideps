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

  function _config() {
    try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); }
    catch (_) { return {}; }
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
    _client = window.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey);
    return _client;
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

  return { login, logout, isConfigured, isLoggedIn, getRole, getName, getEmail, saveSettings };
})();
