// ── Upstaff Partner API Client ────────────────────────────────────────────────
// Connects to the partner's Google Apps Script Web App (backed by Supabase).
// Config stored in localStorage key "upstaff_api_config".

window.UpstaffAPI = (function () {

  var CONFIG_KEY = "upstaff_api_config";

  // ── Config ──────────────────────────────────────────────────────────────────
  function _config() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveConfig(cfg) {
    // Never persist password
    delete cfg.password;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  }

  // One-time migration: remove any previously stored password
  (function _clearLegacyPassword() {
    try {
      var c = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}");
      if (c.password) {
        delete c.password;
        localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
      }
    } catch (e) {}
  })();

  function isConfigured() {
    var c = _config();
    return !!(c.webAppUrl && c.token);
  }

  // ── Core POST ───────────────────────────────────────────────────────────────
  async function _post(payload) {
    var c = _config();
    if (!c.webAppUrl) throw new Error("Partner API URL not configured.");

    var resp = await fetch(c.webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" }, // Apps Script CORS workaround
      body: JSON.stringify(payload),
    });

    if (!resp.ok) throw new Error("HTTP " + resp.status);
    var json = await resp.json();
    if (json.result === "error") throw new Error(json.message || "API error");
    return json;
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  async function login(email, password) {
    var c = _config();
    var json = await _post({ action: "login", email: email, password: password });
    if (!json.token) throw new Error("No token returned from API.");
    // Save only non-sensitive fields — never persist the password
    c.email = email;
    c.token = json.token;
    saveConfig(c);
    return json;
  }

  function logout() {
    var c = _config();
    delete c.token;
    saveConfig(c);
  }

  // ── Applicants ──────────────────────────────────────────────────────────────
  async function getApplicants(opts) {
    var c = _config();
    opts = opts || {};
    var payload = {
      action: "getData",
      token:  c.token,
      page:   opts.page  || 1,
      limit:  opts.limit || 500, // fetch up to 500 at once
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
      action:   "updateStatus",
      token:    c.token,
      email:    opts.email,
      fullName: opts.fullName,
      status:   opts.status,
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
    "For Interview":            "Interview",
    "Interviewed":              "Review",
    "For Client Endorsement":   "Review",
    "Hired":                    "Hired",
    "Hired - Resigned":         "Hired",
    "Open for other roles":     "Screening",
    "Could be Revisited":       "Screening",
    "For Future Consideration": "Screening",
    "No Show":                  "Rejected",
    "Not Qualified":            "Rejected",
    "Duplicate Lead":           "Rejected",
    "Rejected":                 "Rejected",
  };

  function mapPartnerStatus(partnerStatus) {
    return PARTNER_STAGE_MAP[partnerStatus] || "Applied";
  }

  // ── Reverse mapper: dashboard stage → partner status ────────────────────────
  var DASHBOARD_TO_PARTNER_MAP = {
    "Applied":    "For Interview",
    "Screening":  "For Interview",
    "Assessment": "For Interview",
    "Interview":  "For Interview",
    "Review":     "Interviewed",
    "Hired":      "Hired",
    "Rejected":   "Rejected",
    "Cancelled":  "Rejected",
  };

  function mapToPartnerStatus(dashboardStage, existingPartnerStatus) {
    var mapped = DASHBOARD_TO_PARTNER_MAP[dashboardStage];
    if (!mapped) return existingPartnerStatus || "For Interview";
    // If the applicant already has a specific partner status that maps to the
    // same dashboard stage, preserve it (e.g. "For Client Endorsement" stays
    // as-is when the stage is still "Review")
    if (existingPartnerStatus && PARTNER_STAGE_MAP[existingPartnerStatus] === dashboardStage) {
      return existingPartnerStatus;
    }
    return mapped;
  }

  // ── Field mapper: partner fields → dashboard task fields ────────────────────
  function mapApplicant(r, localId) {
    var partnerStatus = r.status || "For Interview";
    return {
      // Identity
      id:              localId,       // local numeric id assigned on import
      supabase_id:     r.supabaseId || "",
      _source:         "api",

      // Core display fields (matching existing dashboard expectations)
      name:            r.fullName    || "",
      applicant_name:  r.fullName    || "",
      applicant_email: r.email       || "",
      applicant_phone: r.phone       || "",
      status:          mapPartnerStatus(partnerStatus), // dashboard pipeline stage
      partner_status:  partnerStatus,                   // original partner status (shown as badge)
      position:        r.positions   || "",
      resume_link:     r.resumeLink  || "",
      portfolio_link:  r.portfolioLink || "",
      notes:           r.notes       || "",

      // Extended partner fields
      address:          r.address         || "",
      employment_type:  r.employmentType  || "",
      work_setup:       r.workSetup       || "",
      work_schedule:    r.workSchedule    || "",
      education_level:  r.educationLevel  || "",
      school:           r.school          || "",
      course:           r.course          || "",
      skills:           r.skills          || "",
      tools:            r.tools           || "",
      interview_slots:  r.interviewSlots  || "",
      referral_source:  r.referralSource  || "",
      video_link:       r.videoLink       || "",
      other_docs_link:  r.otherDocsLink   || "",
      drive_folder_link: r.driveFolderLink || "",
      timestamp:        r.timestamp       || "",

      // Defaults for fields the dashboard expects
      priority:    "Medium",
      assignees:   [],
      comments:    [],
      activity:    [],
      attachments: [],
      archived:    false,
    };
  }

  // Sync dashboard stage change → partner API (converts stage → partner status)
  async function syncStatusToApi(task, newDashboardStage) {
    if (task._source !== "api" || !task.supabase_id) return false;
    // Convert dashboard stage (e.g. "Review") → partner status (e.g. "Interviewed")
    var partnerStatus = mapToPartnerStatus(newDashboardStage, task.partner_status);
    try {
      await updateStatus({
        email:    task.applicant_email,
        fullName: task.applicant_name || task.name,
        status:   partnerStatus,
      });
      return partnerStatus; // return the resolved partner status so caller can update task
    } catch (e) {
      console.warn("UpstaffAPI: status sync failed:", e.message);
      return false;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  return {
    isConfigured:   isConfigured,
    getConfig:      _config,
    saveConfig:     saveConfig,
    login:          login,
    logout:         logout,
    getApplicants:  getApplicants,
    getCounts:      getCounts,
    updateStatus:   updateStatus,
    syncStatusToApi:    syncStatusToApi,
    mapToPartnerStatus: mapToPartnerStatus,
    search:             search,
    getJobs:            getJobs,
    addJob:             addJob,
    toggleJob:          toggleJob,
    mapApplicant:       mapApplicant,
  };

})();
