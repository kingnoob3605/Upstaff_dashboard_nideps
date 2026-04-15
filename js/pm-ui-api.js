// ── Upstaff Partner API Client ────────────────────────────────────────────────
// Connects to the partner's Google Apps Script Web App (backed by Supabase).
// Config stored in localStorage key "upstaff_api_config".

window.UpstaffAPI = (function () {
  var CONFIG_KEY = "upstaff_api_config";

  // ── Allowed accounts are stored in Apps Script Script Properties (ALLOWED_USERS) ──
  // No emails are hardcoded here. The backend decides who is authorized and what role
  // they have. To add or remove users, update ALLOWED_USERS in the Apps Script editor:
  //   Apps Script → Project Settings → Script Properties → ALLOWED_USERS
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Config ──────────────────────────────────────────────────────────────────
  function _config() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveConfig(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  }

  function isConfigured() {
    var c = _config();
    // Configured if we have a token OR stored credentials that allow silent re-login
    return !!(c.webAppUrl && c.adminEmail && c.adminPassword);
  }

  // ── Core POST ───────────────────────────────────────────────────────────────
  async function _post(payload, _isRetry) {
    var url = _config().webAppUrl;
    if (!url)
      throw new Error(
        "Web App URL not set. Go to Settings → Partner API and enter your Apps Script URL.",
      );

    var resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" }, // Apps Script CORS workaround
      body: JSON.stringify(payload),
    });

    if (!resp.ok) throw new Error("HTTP " + resp.status);
    var json = await resp.json();

    // Auto-refresh token on auth errors and retry once
    if (json.result === "error") {
      var msg = json.message || "API error";
      var isAuthError = msg.toUpperCase().includes("UNAUTHORIZED") ||
                        msg.toUpperCase().includes("INVALID_TOKEN") ||
                        msg.toUpperCase().includes("SESSION_EXPIRED");
      if (isAuthError && !_isRetry) {
        var refreshed = await silentReLogin();
        if (refreshed) {
          // Update the token in the payload and retry once
          var retryPayload = Object.assign({}, payload, { token: _config().token });
          return _post(retryPayload, true);
        }
      }
      throw new Error(msg);
    }
    return json;
  }

  // ── Auth — Google Sign-In + Apps Script token fetch ─────────────────────────
  // Step 1: Google verifies identity (email check)
  // Step 2: App calls Apps Script login with stored ADMIN credentials → gets token
  // Nothing sensitive is hardcoded — credentials come from Settings UI
  async function loginWithGoogle(googlePayload) {
    var email = (googlePayload.email || "").toLowerCase().trim();

    var c = _config();
    if (!c.webAppUrl)
      throw new Error(
        "Web App URL not configured. Go to Settings → Partner API first.",
      );
    if (!c.adminEmail || !c.adminPassword)
      throw new Error(
        "Admin credentials not set. Go to Settings → Partner API and enter ADMIN_EMAIL and ADMIN_PASSWORD.",
      );

    // Send the Google email to the backend — Apps Script checks it against
    // ALLOWED_USERS in Script Properties and returns the role + name.
    // No email list exists in this file.
    var resp = await fetch(c.webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action:      "login",
        email:       c.adminEmail,
        password:    c.adminPassword,
        googleEmail: email,
      }),
    });
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    var json = await resp.json();
    if (json.result === "error")
      throw new Error(json.message || "Login failed");

    c.email    = email;
    c.name     = json.name || googlePayload.name || email;
    c.role     = json.role;
    c.picture  = googlePayload.picture || "";
    c.token    = json.token;
    c.login_at = Date.now();
    delete c.loggedOut;
    saveConfig(c);

    // Pre-populate upstaff_profile with Google account data
    try {
      var nameParts = (googlePayload.name || "").trim().split(" ");
      var firstName = nameParts[0] || "";
      var lastName  = nameParts.slice(1).join(" ") || "";
      var existingProfile = JSON.parse(
        localStorage.getItem("upstaff_profile") || "{}",
      );
      existingProfile.firstName = firstName || existingProfile.firstName || "";
      existingProfile.lastName  = lastName  || existingProfile.lastName  || "";
      existingProfile.email     = email     || existingProfile.email     || "";
      localStorage.setItem("upstaff_profile", JSON.stringify(existingProfile));
    } catch (_) {}

    return { role: json.role, name: json.name || c.name };
  }

  function logout() {
    var c = _config();
    delete c.token;
    delete c.login_at;
    c.loggedOut = true; // Prevent silent re-login on next page load
    saveConfig(c);
  }

  function isSessionExpired() {
    var c = _config();
    if (!c.token || !c.login_at) return false;
    return Date.now() - c.login_at > 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  // Silent re-login using stored credentials — no Google OAuth needed
  async function silentReLogin() {
    var c = _config();
    if (!c.webAppUrl || !c.adminEmail || !c.adminPassword) return false;
    try {
      var resp = await fetch(c.webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action:      "login",
          email:       c.adminEmail,
          password:    c.adminPassword,
          googleEmail: c.email || "",
        }),
      });
      if (!resp.ok) return false;
      var json = await resp.json();
      if (json.result !== "success" || !json.token) return false;
      c.token = json.token;
      c.login_at = Date.now();
      saveConfig(c);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function verifySession() {
    var c = _config();

    // User explicitly logged out — require manual sign-in, skip silent re-login
    if (c.loggedOut) return false;

    // Fast path — valid non-expired token, no network call needed
    if (c.token && !isSessionExpired()) {
      return true;
    }

    // No valid token — try silent re-login if credentials are configured
    if (c.webAppUrl && c.adminEmail && c.adminPassword) {
      var relogged = await silentReLogin();
      if (relogged) return true;

      // silentReLogin failed.
      // If we HAD a token before (just expired or network is down), let the user
      // continue with cached data. The next real API call (syncApplicantsFromApi)
      // will try the token, get "unauthorized", and trigger silentReLogin again.
      // Only force sign-in when there is absolutely no token AND re-login fails.
      if (c.token) return true;

      return false; // credentials configured but no token and re-login failed
    }

    // No credentials configured at all — must sign in
    return false;
  }

  async function sendEmail(to, subject, body, fromName) {
    var c = _config();
    return _post({
      action: "sendEmail",
      token: c.token,
      to: to,
      subject: subject,
      body: body,
      fromName: fromName || "Upstaff HR",
    });
  }

  // ── Applicants ──────────────────────────────────────────────────────────────
  async function getApplicants(opts) {
    var c = _config();
    opts = opts || {};
    var payload = {
      action: "getData",
      token: c.token,
      page: opts.page || 1,
      limit: opts.limit || 500, // fetch up to 500 at once
    };
    if (opts.status && opts.status !== "All") payload.status = opts.status;
    return _post(payload);
  }

  async function getCounts() {
    var c = _config();
    return _post({ action: "getCounts", token: c.token });
  }

  async function updateStatus(opts) {
    // opts: { email, fullName, status }
    var c = _config();
    return _post({
      action: "updateStatus",
      token: c.token,
      email: opts.email,
      fullName: opts.fullName,
      status: opts.status,
    });
  }

  async function deleteApplicant(opts) {
    // opts: { email, supabaseId }
    var c = _config();
    return _post({
      action: "deleteApplicant",
      token: c.token,
      email: opts.email,
      supabaseId: opts.supabaseId,
    });
  }

  async function search(query) {
    var c = _config();
    return _post({ action: "search", token: c.token, query: query });
  }

  // ── Jobs ────────────────────────────────────────────────────────────────────
  async function getJobs() {
    var c = _config();
    return _post({ action: "getJobs", token: c.token });
  }

  async function addJob(title) {
    var c = _config();
    return _post({ action: "addJob", token: c.token, title: title });
  }

  async function toggleJob(index) {
    var c = _config();
    return _post({ action: "toggleJob", token: c.token, index: index });
  }

  // ── Partner status → dashboard stage mapping ────────────────────────────────
  var PARTNER_STAGE_MAP = {
    "For Interview": "New",
    Interviewed: "Interviewed",
    "For Client Endorsement": "For Client Endorsement",
    Hired: "Hired",
    "Hired - Resigned": "Hired",
    "Open for other Roles": "Open for other Roles",
    "Open for other roles": "Open for other Roles",
    "Could be Revisited": "Could be Revisited",
    "For Future Consideration": "For Future Consideration",
    "No Show": "Closed",
    "Not Qualified": "Closed",
    "Duplicate Lead": "Closed",
    Rejected: "Closed",
  };

  function mapPartnerStatus(partnerStatus) {
    return PARTNER_STAGE_MAP[partnerStatus] || "New";
  }

  // ── Reverse mapper: dashboard stage → partner status ────────────────────────
  var DASHBOARD_TO_PARTNER_MAP = {
    New: "For Interview",
    "For Interview": "For Interview",
    Interviewed: "Interviewed",
    "For Client Endorsement": "For Client Endorsement",
    Hired: "Hired",
    Closed: "Rejected",
    "For Future Consideration": "For Future Consideration",
    "Could be Revisited": "Could be Revisited",
    "Open for other Roles": "Open for other Roles",
  };

  function mapToPartnerStatus(dashboardStage, existingPartnerStatus) {
    var mapped = DASHBOARD_TO_PARTNER_MAP[dashboardStage];
    if (!mapped) return existingPartnerStatus || "For Interview";
    // If the applicant already has a specific partner status that maps to the
    // same dashboard stage, preserve it (e.g. "For Client Endorsement" stays
    // as-is when the stage is still "Review")
    if (
      existingPartnerStatus &&
      PARTNER_STAGE_MAP[existingPartnerStatus] === dashboardStage
    ) {
      return existingPartnerStatus;
    }
    return mapped;
  }

  // ── Helpers: parse bullet-separated list fields from Google Sheets ──────────
  // Google Forms / Sheets often stores multi-select answers as "• A • B • C"
  function _parseBulletList(str) {
    if (!str) return [];
    return str.split("•").map(function(s) { return s.trim(); }).filter(Boolean);
  }
  // Extract first item from a bullet list (used for single-value fields like position)
  function _firstBullet(str) {
    var items = _parseBulletList(str);
    return items.length ? items[0] : (str || "").trim();
  }
  // Normalize employment type casing to match dashboard options
  // e.g. "Project-Based" → "Project-based", "Full Time" → "Full-time"
  var _EMPTYPE_NORM = {
    "full-time": "Full-time", "full time": "Full-time", "fulltime": "Full-time",
    "part-time": "Part-time", "part time": "Part-time", "parttime": "Part-time",
    "contract": "Contract", "contractual": "Contract",
    "freelance": "Freelance",
    "project-based": "Project-based", "project based": "Project-based",
  };
  function _normalizeEmpType(val) {
    if (!val) return "";
    var key = val.toLowerCase().replace(/[-\s]+/g, function(m) { return m; });
    return _EMPTYPE_NORM[val.toLowerCase()] || _EMPTYPE_NORM[val.toLowerCase().replace(/\s+/g, "-")] || val;
  }

  // ── Date helper: converts any date string/object to YYYY-MM-DD ───────────────
  function _toDateStr(val) {
    if (!val) return "";
    var d = new Date(val);
    if (isNaN(d)) return "";
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  // ── Field mapper: partner fields → dashboard task fields ────────────────────
  function mapApplicant(r, localId) {
    var partnerStatus = r.status || "For Interview";
    return {
      // Identity
      id: localId, // local numeric id assigned on import
      supabase_id: r.supabaseId || "",
      _source: "api",

      // Core display fields (matching existing dashboard expectations)
      name: r.fullName || "",
      applicant_name: r.fullName || "",
      applicant_email: r.email || "",
      applicant_phone: r.phone || "",
      status: mapPartnerStatus(partnerStatus), // dashboard pipeline stage
      partner_status: partnerStatus, // original partner status (shown as badge)
      // Positions may come as "• Full-Stack Web Developer • Back-End Web Developer"
      position: _firstBullet(r.positions || r.position || ""),
      resume_link: r.resumeLink || "",
      portfolio_link: r.portfolioLink || "",
      notes: r.notes || "",

      // Extended partner fields
      address: r.address || "",
      employment_type: _normalizeEmpType(r.employmentType || r.employment_type || ""),
      work_setup: r.workSetup || r.work_setup || "",
      work_schedule: (r.workSchedule || r.work_schedule || "")
        .split(/[•\n,]/).map(function(s){ return s.trim(); }).filter(Boolean).join(", "),
      education_level: r.educationLevel || r.education_level || "",
      school: r.school || "",
      course: r.course || "",
      skills: r.skills || "",
      tools: r.tools || "",
      // Interview slots may come as "• 2026-04-02 @ 21:10" — strip bullet prefix
      interview_slots: (r.interviewSlots || r.interview_slots || "").replace(/^•\s*/, "").trim(),
      referral_source: r.referralSource || r.referral_source || "",
      referral_code: r.referralCode || r.referral_code || "",
      video_intro_link:
        r.videoIntroLink ||
        r.videoLink ||
        r.video_intro_link ||
        r.video_link ||
        "",
      other_docs_link: r.otherDocsLink || r.other_docs_link || "",
      drive_folder_link: r.driveFolderLink || r.drive_folder_link || "",
      application_date: _toDateStr(r.timestamp || r.application_date || r.created_at || ""),
      timestamp: r.timestamp || "",

      // Assessment scores — joined from Assessments sheet by getData
      typing_score:     r.typing_score     || r.typingScore     || "",
      word_typing:      r.word_typing      || r.wordTyping      || "",
      knowledge_score:  r.knowledge_score  || r.knowledgeScore  || "",
      verbal_link:      r.verbal_link      || r.verbalLink      || "",
      conflict_score:   r.conflict_score   || r.conflictScore   || "",
      grammar_score:    r.grammar_score    || r.grammarScore    || "",
      data_entry_score: r.data_entry_score || r.dataEntryScore  || "",
      formatting_score: r.formatting_score || r.formattingScore || "",
      sorting_score:    r.sorting_score    || r.sortingScore    || "",

      // Defaults for fields the dashboard expects
      priority: "Medium",
      assignees: [],
      comments: [],
      activity: [],
      attachments: [],
      archived: false,
    };
  }

  async function addApplicant(applicant) {
    var c = _config();
    return _post({
      action: "addApplicant",
      token: c.token,
      applicant: applicant,
    });
  }

  // Update all applicant fields in the sheet (full field sync on edit)
  async function updateApplicant(data) {
    var c = _config();
    return _post({
      action: "updateApplicant",
      token: c.token,
      applicant: data,
    });
  }

  // Sync dashboard stage change → partner API (converts stage → partner status)
  async function syncStatusToApi(task, newDashboardStage) {
    if (task._source !== "api" || !task.supabase_id) return false;
    // Convert dashboard stage (e.g. "Review") → partner status (e.g. "Interviewed")
    var partnerStatus = mapToPartnerStatus(
      newDashboardStage,
      task.partner_status,
    );
    try {
      await updateStatus({
        email: task.applicant_email,
        fullName: task.applicant_name || task.name,
        status: partnerStatus,
      });
      return partnerStatus; // return the resolved partner status so caller can update task
    } catch (e) {
      console.warn("UpstaffAPI: status sync failed:", e.message);
      return false;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  return {
    isConfigured: isConfigured,
    isSessionExpired: isSessionExpired,
    verifySession: verifySession,
    getConfig: _config,
    saveConfig: saveConfig,
    loginWithGoogle: loginWithGoogle,
    logout: logout,
    sendEmail: sendEmail,
    getApplicants: getApplicants,
    getCounts: getCounts,
    updateStatus: updateStatus,
    updateApplicant: updateApplicant,
    syncStatusToApi: syncStatusToApi,
    mapToPartnerStatus: mapToPartnerStatus,
    addApplicant: addApplicant,
    deleteApplicant: deleteApplicant,
    search: search,
    getJobs: getJobs,
    addJob: addJob,
    toggleJob: toggleJob,
    mapApplicant: mapApplicant,
  };
})();
