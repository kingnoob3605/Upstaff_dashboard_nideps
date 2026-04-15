/* ══════════════════════════════════════════════
   UTILITY — Debounce
   Delays a function until user stops typing.
══════════════════════════════════════════════ */
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* ══════════════════════════════════════════════
   UTILITY — Sanitize
   Escapes HTML special chars to prevent XSS.
   Use: sanitize(userInput) before innerHTML.
══════════════════════════════════════════════ */
function sanitize(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ══════════════════════════════════════════════
   INPUT VALIDATION LAYER
   validateField(value, type) → { ok, message }
   Types: "name" | "email" | "phone" | "url" | "date" | "required"
   showFieldError(inputEl, message) — attaches inline error under input
   clearFieldError(inputEl)         — removes inline error
   validateForm(rules)              — validates multiple fields at once
     rules = [{ id, type, label }]
     returns true if all pass, false + shows errors if any fail
══════════════════════════════════════════════ */

function validateField(value, type) {
  const v = (value || "").trim();
  switch (type) {
    case "required":
      return v.length > 0
        ? { ok: true }
        : { ok: false, message: "This field is required." };
    case "name":
      if (!v) return { ok: false, message: "Name is required." };
      if (v.length < 2)
        return { ok: false, message: "Name must be at least 2 characters." };
      if (v.length > 80)
        return { ok: false, message: "Name is too long (max 80 chars)." };
      if (/[<>{}]/.test(v))
        return { ok: false, message: "Name contains invalid characters." };
      return { ok: true };
    case "email":
      if (!v) return { ok: true }; // email optional unless caller requires it
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
        ? { ok: true }
        : { ok: false, message: "Enter a valid email address." };
    case "phone":
      if (!v) return { ok: true }; // phone optional
      return /^[\d\s\-\+\(\)]{7,20}$/.test(v)
        ? { ok: true }
        : { ok: false, message: "Enter a valid phone number." };
    case "url":
      if (!v) return { ok: true }; // url optional
      try {
        new URL(v);
        return { ok: true };
      } catch {
        return { ok: false, message: "Enter a valid URL (include https://)." };
      }
    case "date":
      if (!v) return { ok: false, message: "Date is required." };
      return isNaN(Date.parse(v))
        ? { ok: false, message: "Enter a valid date." }
        : { ok: true };
    default:
      return { ok: true };
  }
}

function showFieldError(inputEl, message) {
  if (!inputEl) return;
  inputEl.classList.add("u-input-error");
  inputEl.classList.remove("u-input-ok");
  let msg = inputEl.parentElement?.querySelector(".u-field-error-msg");
  if (!msg) {
    msg = document.createElement("div");
    msg.className = "u-field-error-msg";
    inputEl.parentElement?.appendChild(msg);
  }
  msg.textContent = message;
  msg.classList.add("visible");
}

function clearFieldError(inputEl) {
  if (!inputEl) return;
  inputEl.classList.remove("u-input-error");
  // Only add ok style if has value
  if (inputEl.value?.trim()) inputEl.classList.add("u-input-ok");
  const msg = inputEl.parentElement?.querySelector(".u-field-error-msg");
  if (msg) msg.classList.remove("visible");
}

function clearAllFieldErrors(containerEl) {
  if (!containerEl) return;
  containerEl.querySelectorAll(".u-input-error").forEach((el) => {
    el.classList.remove("u-input-error", "u-input-ok");
  });
  containerEl.querySelectorAll(".u-field-error-msg.visible").forEach((el) => {
    el.classList.remove("visible");
  });
}

/**
 * validateForm(rules) — validate multiple fields at once.
 * rules = [{ id: "input-id", type: "name"|"email"|..., label: "Field Name" }]
 * Returns true if all pass. Shows inline errors and returns false if any fail.
 */
function validateForm(rules) {
  let allOk = true;
  rules.forEach(({ id, type, label }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const result = validateField(el.value, type);
    if (!result.ok) {
      showFieldError(el, result.message || `${label || "Field"} is invalid.`);
      allOk = false;
    } else {
      clearFieldError(el);
    }
  });
  return allOk;
}

/* ══════════════════════════════════════════════
   UTILITY — Debug Logger
   Set DEBUG = true to enable console output.
══════════════════════════════════════════════ */
const DEBUG = false;
function dbg(...args) {
  if (DEBUG) console.log(...args);
}

/* ══════════════════════════════════════════════
   CONSTANTS & DATA
══════════════════════════════════════════════ */
const PRIORITY_COLORS = {
  Low: "#43e97b",
  Medium: "#44d7e9",
  High: "#fa8231",
  Urgent: "#ff6584",
};
/* ── Recruitment Pipeline stages ──────────────────────────────────────────
   Applied → Screening → Assessment → Interview → Review → Hired / Rejected / Cancelled
   Legacy generic statuses are preserved as aliases so old data still renders.
───────────────────────────────────────────────────────────────────────── */
const STATUS_META = {
  // ── Pipeline stages ──
  "New":         { color: "#6c63ff", bg: "#ede9ff" },
  "In Progress": { color: "#f59e0b", bg: "#fef3c7" },
  "Endorsed":    { color: "#3ecfdf", bg: "#e0fafb" },
  "Hired":       { color: "#43e97b", bg: "#e8fdf1" },
  "Others":      { color: "#60a5fa", bg: "#dbeafe" },
  "Closed":      { color: "#9ca3af", bg: "#f3f4f6" },
  // ── Legacy aliases (keeps old tasks rendering correctly) ──
  "Applied":     { color: "#6c63ff", bg: "#ede9ff" },
  "Screening":   { color: "#6c63ff", bg: "#ede9ff" },
  "Assessment":  { color: "#f59e0b", bg: "#fef3c7" },
  "Interview":   { color: "#f59e0b", bg: "#fef3c7" },
  "Review":      { color: "#3ecfdf", bg: "#e0fafb" },
  "Rejected":    { color: "#9ca3af", bg: "#f3f4f6" },
  "Cancelled":   { color: "#9ca3af", bg: "#f3f4f6" },
  "To Do":       { color: "#6c63ff", bg: "#ede9ff" },
  "In Review":   { color: "#3ecfdf", bg: "#e0fafb" },
  "Done":        { color: "#43e97b", bg: "#e8fdf1" },
  // ── Partner statuses (from Supabase / Google Sheets) ──
  "For Interview":            { color: "#0369a1", bg: "#e0f2fe" },
  "Interviewed":              { color: "#059669", bg: "#d1fae5" },
  "For Client Endorsement":   { color: "#7c3aed", bg: "#ede9fe" },
  "Hired - Resigned":         { color: "#ea580c", bg: "#ffedd5" },
  "Open for other Roles":     { color: "#2563eb", bg: "#dbeafe" },
  "Could be Revisited":       { color: "#0284c7", bg: "#e0f2fe" },
  "For Future Consideration": { color: "#475569", bg: "#f1f5f9" },
  "No Show":                  { color: "#a16207", bg: "#fef9c3" },
  "Not Qualified":            { color: "#64748b", bg: "#f1f5f9" },
  "Duplicate Lead":           { color: "#a21caf", bg: "#fae8ff" },
};

/** Returns the CSS class for a status pill — theme-aware, always readable */
function statusPillClass(status) {
  const map = {
    // Pipeline stages
    "New":                      "sp-new",
    "For Interview":            "sp-forinterview",
    "Interviewed":              "sp-interviewed",
    "For Client Endorsement":   "sp-forclientendorsement",
    "Hired":                    "sp-hired",
    "Closed":                   "sp-closed",
    // Partner / Google Sheet statuses
    "Hired - Resigned":         "sp-hiredresigned",
    "Open for other Roles":     "sp-openotherroles",
    "Could be Revisited":       "sp-couldberevisited",
    "For Future Consideration": "sp-forfuture",
    "No Show":                  "sp-noshow",
    "Not Qualified":            "sp-notqualified",
    "Duplicate Lead":           "sp-duplicatelead",
    // Legacy aliases
    "In Progress": "sp-inprogress",
    "Endorsed":    "sp-endorsed",
    "Applied":     "sp-new",
    "Screening":   "sp-new",
    "Assessment":  "sp-inprogress",
    "Interview":   "sp-forinterview",
    "Review":      "sp-forclientendorsement",
    "Rejected":    "sp-closed",
    "Cancelled":   "sp-closed",
    "To Do":       "sp-new",
    "In Review":   "sp-endorsed",
    "Done":        "sp-hired",
  };
  return "status-pill " + (map[status] || "sp-new");
}

/** Returns class for calendar event status pills */
function calStatusPillClass(status) {
  const map = {
    Scheduled: "sp-inprog",
    Completed: "sp-done",
    Rescheduled: "sp-review",
    Cancelled: "sp-cancelled",
  };
  return "status-pill " + (map[status] || "sp-todo");
}
const AVATAR_COLORS = [
  "#6c63ff",
  "#44d7e9",
  "#fa8231",
  "#43e97b",
  "#ff6584",
  "#f59e0b",
];

/* ══════════════════════════════════════════════
   JOB POSITIONS — Single source of truth
   Used by task modal, calendar modal, analytics, settings
══════════════════════════════════════════════ */
const JOB_POSITIONS = [
  "Accountant",
  "Accounts Payable Specialist",
  "Accounts VA",
  "Administrative Assistant",
  "Admin Support",
  "Amazon & Levanta Marketing Manager",
  "Amazon Listing & SKU Specialist",
  "Architectural Draftsperson",
  "Attorney",
  "Backend Web Developer",
  "Bookkeeper",
  "Client Communication & Sales Coordinator",
  "Customer Service Representative",
  "Data Entry Specialist",
  "Ecommerce Listing & Optimizing Specialist",
  "Ecommerce VA",
  "General Ledger Accountant",
  "German Reading and Writing Support",
  "Google Advertising Specialist",
  "Graphic Designer",
  "Graphic Designer / Social Media Content",
  "HR Assistant",
  "Intake Caller",
  "Meta Advertising Specialist",
  "Patient Care Admin Associate",
  "Recruitment Officer",
  "Spanish Client Support Specialist",
  "Team Leader",
  "Video Editor",
];

/* ── Candidate folders ── */
const CANDIDATE_FOLDERS = [
  "Waiting List",
  "Talent Pool / Shortlisted",
];
const LS_KEYS_CANDIDATES = "upstaff_candidates";

/* ── Public calendars available for subscription ── */
const PUBLIC_CALENDARS = [
  {
    id: "en.christian#holiday@group.v.calendar.google.com",
    name: "Christian Holidays",
    icon: "✝️",
    desc: "Official Christian holiday calendar",
  },
  {
    id: "en.philippines#holiday@group.v.calendar.google.com",
    name: "Philippine Public Holidays",
    icon: "🇵🇭",
    desc: "Official Philippine national holidays",
  },
  {
    id: "en.islamic#holiday@group.v.calendar.google.com",
    name: "Islamic Holidays",
    icon: "☪️",
    desc: "Official Islamic holidays",
  },
  {
    id: "en.usa#holiday@group.v.calendar.google.com",
    name: "US Holidays",
    icon: "🇺🇸",
    desc: "US public holidays",
  },
];

/* ── Candidates store ── */
let CANDIDATES = [];
(function loadCandidates() {
  try {
    const raw = localStorage.getItem(LS_KEYS_CANDIDATES);
    if (raw) CANDIDATES = JSON.parse(raw);
  } catch (e) {
    CANDIDATES = [];
  }
})();
function saveCandidates() {
  try {
    localStorage.setItem(LS_KEYS_CANDIDATES, JSON.stringify(CANDIDATES));
  } catch (e) {
    console.warn("[Persist] ⚠️ Could not save candidates:", e);
  }
}

/* ── Drag state ── */
let _dragTaskId = null;

/* ── Bulk selection state ── */
let selectedTaskIds = new Set();

function _updateBulkToolbar() {
  const tb = document.getElementById("bulk-toolbar");
  const label = document.getElementById("bulk-count-label");
  if (!tb) return;
  if (selectedTaskIds.size > 0) {
    tb.style.display = "flex";
    if (label) label.textContent = `${selectedTaskIds.size} selected`;
  } else {
    tb.style.display = "none";
  }
  const _bmBtn = document.getElementById('bulk-move-stage-btn');
  if (_bmBtn) {
    const _statuses = [...new Set([...selectedTaskIds].map(id => TASKS.find(t => t.id === id)?.status).filter(Boolean))];
    const _mixed = _statuses.length > 1;
    _bmBtn.style.opacity = _mixed ? '0.45' : '1';
    _bmBtn.title = _mixed ? 'Select applicants from the same stage only.' : '';
  }
}

function toggleBulkSelect(taskId, checkboxEl) {
  if (selectedTaskIds.has(taskId)) {
    selectedTaskIds.delete(taskId);
    if (checkboxEl) checkboxEl.checked = false;
  } else {
    selectedTaskIds.add(taskId);
    if (checkboxEl) checkboxEl.checked = true;
  }
  _updateBulkToolbar();
}

function clearBulkSelection() {
  const _bmsm = document.getElementById('bulk-move-stage-menu');
  if (_bmsm) _bmsm.style.display = 'none';
  selectedTaskIds.clear();
  _updateBulkToolbar();
  refreshCurrentView();
}

async function bulkAdvanceStage() {
  if (!selectedTaskIds.size) return;
  const ids = [...selectedTaskIds];
  const confirmed = await uiConfirm(
    `Advance ${ids.length} applicant(s) to their next pipeline stage?`,
    { icon: "⏩", title: "Advance Stage", okText: "Advance" }
  );
  if (!confirmed) return;
  ids.forEach((id) => {
    const t = TASKS.find((x) => x.id === id);
    if (!t) return;
    const next = getNextStage(t.status);
    if (next) moveApplicantToStage(id, next, { silent: true });
  });
  selectedTaskIds.clear();
  refreshCurrentView();
  _updateBulkToolbar();
  showToast(`✅ ${ids.length} applicant(s) advanced.`);
}

function toggleBulkMoveStageMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('bulk-move-stage-menu');
  if (!menu) return;
  if (menu.style.display !== 'none') { menu.style.display = 'none'; return; }

  const ids = [...selectedTaskIds];
  const statuses = [...new Set(ids.map(id => TASKS.find(t => t.id === id)?.status).filter(Boolean))];

  if (statuses.length !== 1) {
    menu.innerHTML = `<div style="padding:8px 12px;font-size:12px;font-weight:600;font-family:'Montserrat',sans-serif;color:#f59e0b;white-space:normal;max-width:200px;">Select applicants from the same stage only.</div>`;
  } else {
    const idx = STAGE_ORDER.indexOf(statuses[0]);
    const fwd = idx >= 0 ? STAGE_ORDER.slice(idx + 1).filter(s => !TERMINAL_STAGES.includes(s)) : [];
    const othersOpts = OTHERS_STATUSES.filter(s => s !== statuses[0]);
    const btnStyle = `display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600;font-family:'Montserrat',sans-serif;color:var(--muted);cursor:pointer;background:transparent;border:none;width:100%;text-align:left;white-space:nowrap;`;
    const btnHover = `onmouseover="this.style.background='var(--surface-3)';this.style.color='var(--text)'" onmouseout="this.style.background='transparent';this.style.color='var(--muted)'"`;
    if (!fwd.length && !othersOpts.length) {
      menu.innerHTML = `<div style="padding:8px 12px;font-size:12px;font-weight:600;font-family:'Montserrat',sans-serif;color:var(--muted);">No stages available.</div>`;
    } else {
      let html = fwd.map(stage => `<button onclick="bulkMoveToStage('${stage}')" style="${btnStyle}" ${btnHover}>${stage}</button>`).join('');
      if (othersOpts.length) {
        if (fwd.length) html += `<div style="margin:4px 8px;border-top:1px solid var(--border);"></div>`;
        html += `<div style="padding:4px 12px 2px;font-size:10px;font-weight:700;color:var(--muted);font-family:'Montserrat',sans-serif;text-transform:uppercase;letter-spacing:.5px;">Others</div>`;
        html += othersOpts.map(stage => `<button onclick="bulkMoveToStage('${stage}')" style="${btnStyle}" ${btnHover}>${stage}</button>`).join('');
      }
      menu.innerHTML = html;
    }
  }
  menu.style.display = 'block';
  setTimeout(() => {
    document.addEventListener('click', function _close() {
      const m = document.getElementById('bulk-move-stage-menu');
      if (m) m.style.display = 'none';
      document.removeEventListener('click', _close);
    });
  }, 0);
}

function bulkMoveToStage(targetStage) {
  const ids = [...selectedTaskIds];
  if (!ids.length) return;
  const menu = document.getElementById('bulk-move-stage-menu');
  if (menu) menu.style.display = 'none';
  ids.forEach(id => moveApplicantToStage(id, targetStage, { silent: true }));
  clearBulkSelection();
  refreshCurrentView();
  showToast(`✅ Moved ${ids.length} applicant${ids.length !== 1 ? 's' : ''} to ${targetStage}`);
}

async function bulkReject() {
  if (!selectedTaskIds.size) return;
  const ids = [...selectedTaskIds].filter((id) => {
    const t = TASKS.find((x) => x.id === id);
    return t && !TERMINAL_STAGES.includes(t.status);
  });
  if (!ids.length) { showToast("No eligible applicants to reject."); return; }
  const reason = await _pickRejectionReason();
  if (reason === null) return;
  const confirmed = await uiConfirm(
    `Reject ${ids.length} applicant(s)? Reason: "${reason}". They will be archived.`,
    { icon: "🚫", title: "Bulk Reject", okText: "Reject All", okDanger: true }
  );
  if (!confirmed) return;
  ids.forEach((id) => {
    const t = TASKS.find((x) => x.id === id);
    if (t) {
      t.rejection_reason = reason;
      moveApplicantToStage(id, "Closed", { silent: true });
    }
  });
  selectedTaskIds.clear();
  refreshCurrentView();
  _updateBulkToolbar();
  showToast(`🚫 ${ids.length} applicant(s) rejected.`);
}

/* ── Seed task data ── */
const _SEED_TASKS_UNUSED_REMOVED = [
  {
    id: 1,
    name: "Maria Santos",
    status: "Screening",
    priority: "High",
    position: "Intake Caller",
    assignee: "Assistant",
    start: "2026-03-08",
    due: "2026-03-15",
    notes: "Strong resume from referral",
    applicant_name: "Maria Santos",
    applicant_email: "maria.santos@gmail.com",
    applicant_phone: "09171234567",
    resume_link: "https://drive.google.com/file/maria-santos-resume",
    portfolio_link: "",
    application_date: "2026-03-07",
    typing_score: "",
    knowledge_score: "82",
    verbal_link: "",
    interview_notes: "",
    candidateFolder: "",
  },
  {
    id: 2,
    name: "Paolo Garcia",
    status: "Applied",
    priority: "Medium",
    position: "CSR",
    assignee: "Ana Reyes",
    start: "2026-03-10",
    due: "2026-03-17",
    notes: "",
    applicant_name: "Paolo Garcia",
    applicant_email: "paolo.garcia@gmail.com",
    applicant_phone: "09281234567",
    resume_link: "",
    portfolio_link: "",
    application_date: "2026-03-10",
    typing_score: "",
    knowledge_score: "",
    verbal_link: "",
    interview_notes: "",
    candidateFolder: "",
  },
  {
    id: 3,
    name: "Sophie Tan",
    status: "Hired",
    priority: "High",
    position: "Team Leader",
    assignee: "CEO Office",
    start: "2026-03-01",
    due: "2026-03-10",
    notes: "Excellent leadership background",
    applicant_name: "Sophie Tan",
    applicant_email: "sophie.tan@gmail.com",
    applicant_phone: "09351234567",
    resume_link: "https://drive.google.com/file/sophie-tan-resume",
    portfolio_link: "",
    application_date: "2026-02-28",
    typing_score: "",
    knowledge_score: "91",
    verbal_link: "https://drive.google.com/verbal-sophie",
    interview_notes: "Outstanding panel performance. Unanimous hire.",
    hired_at: "2026-03-10",
    candidateFolder: "Ready to Hire",
  },
  {
    id: 4,
    name: "David Lim",
    status: "Review",
    priority: "Urgent",
    position: "HR Assistant",
    assignee: "HR Panel",
    start: "2026-03-12",
    due: "2026-03-15",
    notes: "3 panel interviewers",
    applicant_name: "David Lim",
    applicant_email: "david.lim@gmail.com",
    applicant_phone: "09451234567",
    resume_link: "",
    portfolio_link: "",
    application_date: "2026-03-11",
    typing_score: "",
    knowledge_score: "76",
    verbal_link: "",
    interview_notes:
      "Good cultural fit. Needs follow-up on salary expectations.",
    candidateFolder: "Ready to Call",
  },
  {
    id: 5,
    name: "Angela Cruz",
    status: "Assessment",
    priority: "Medium",
    position: "Google Ads Specialist",
    assignee: "Marketing",
    start: "2026-03-11",
    due: "2026-03-13",
    notes: "",
    applicant_name: "Angela Cruz",
    applicant_email: "angela.cruz@gmail.com",
    applicant_phone: "09561234567",
    resume_link: "https://drive.google.com/file/angela-resume",
    portfolio_link: "https://behance.net/angelacruz",
    application_date: "2026-03-10",
    typing_score: "",
    knowledge_score: "",
    verbal_link: "",
    interview_notes: "",
    candidateFolder: "",
  },
  {
    id: 6,
    name: "Mark Villanueva",
    status: "Screening",
    priority: "Low",
    position: "CSR",
    assignee: "Assistant",
    start: "2026-03-09",
    due: "2026-03-18",
    notes: "",
    applicant_name: "Mark Villanueva",
    applicant_email: "mark.v@gmail.com",
    applicant_phone: "09671234567",
    resume_link: "",
    portfolio_link: "",
    application_date: "2026-03-09",
    typing_score: "",
    knowledge_score: "",
    verbal_link: "",
    interview_notes: "",
    candidateFolder: "",
  },
  {
    id: 7,
    name: "Mia Flores",
    status: "Interview",
    priority: "High",
    position: "Intake Caller",
    assignee: "Assistant",
    start: "2026-03-17",
    due: "2026-03-19",
    notes: "Offer ready if passes",
    applicant_name: "Mia Flores",
    applicant_email: "mia.flores@gmail.com",
    applicant_phone: "09781234567",
    resume_link: "",
    portfolio_link: "",
    application_date: "2026-03-15",
    typing_score: "68",
    knowledge_score: "88",
    verbal_link: "https://drive.google.com/verbal-mia",
    interview_notes: "",
    candidateFolder: "Talent Pool / Shortlisted",
  },
  {
    id: 8,
    name: "John Reyes",
    status: "Assessment",
    priority: "Low",
    position: "CSR",
    assignee: "Assistant",
    start: "2026-03-11",
    due: "2026-03-13",
    notes: "",
    applicant_name: "John Reyes",
    applicant_email: "john.reyes@gmail.com",
    applicant_phone: "09891234567",
    resume_link: "",
    portfolio_link: "",
    application_date: "2026-03-11",
    typing_score: "74",
    knowledge_score: "",
    verbal_link: "",
    interview_notes: "",
    candidateFolder: "",
  },
  {
    id: 9,
    name: "Jay Santos",
    status: "Interview",
    priority: "Medium",
    position: "Team Leader",
    assignee: "Ana Reyes",
    start: "2026-03-16",
    due: "2026-03-17",
    notes: "",
    applicant_name: "Jay Santos",
    applicant_email: "jay.santos@gmail.com",
    applicant_phone: "09901234567",
    resume_link: "",
    portfolio_link: "",
    application_date: "2026-03-14",
    typing_score: "",
    knowledge_score: "79",
    verbal_link: "",
    interview_notes: "Solid management experience.",
    candidateFolder: "",
  },
  {
    id: 10,
    name: "Grace Ramos",
    status: "Cancelled",
    priority: "Low",
    position: "CSR",
    assignee: "Assistant",
    start: "2026-03-10",
    due: "2026-03-14",
    notes: "Withdrew application",
    applicant_name: "Grace Ramos",
    applicant_email: "grace.ramos@gmail.com",
    applicant_phone: "09011234567",
    resume_link: "",
    portfolio_link: "",
    application_date: "2026-03-09",
    typing_score: "",
    knowledge_score: "",
    verbal_link: "",
    interview_notes: "",
    archived: true,
    candidateFolder: "",
  },
];

/* ── Seed calendar events ── (empty — real events come from the form or Google Calendar sync) */
const SEED_CALENDAR_EVENTS = [];

/* Mutable working copies — hydrated from localStorage below */
let TASKS = [];
let calEvents = [];

/* ── Google Calendar registry — must be declared BEFORE persistLoad() is called ── */
/* Moved up from its original position to avoid a temporal dead zone crash:          */
/* persistLoad() (line ~497) assigns UPSTAFF_CALENDARS, so it must exist first.      */
let UPSTAFF_CALENDARS = [];

/* Runtime state */
let taskNextId = 100;
let taskEditId = null;
let calNextId = 200;
let calEditId = null;
let tableSort = { col: "due", dir: 1 };

/* ══════════════════════════════════════════════
   PERSISTENCE LAYER — localStorage
   ──────────────────────────────────────────────
   Strategy:
   • Local events (manually created) → saved to localStorage on every mutation.
   • Google Calendar events           → NOT stored locally; re-fetched on load
                                        via silent OAuth token refresh.
   • TASKS                            → saved to localStorage on every mutation.
   • ID counters                      → saved to prevent collisions after reload.
   • gcal_signed flag                 → remembers if user previously signed in
                                        so we can attempt a silent re-auth on load.

   localStorage keys
   ─────────────────────────────────────────────
   upstaff_calEvents   — JSON array of LOCAL calendar events
   upstaff_tasks       — JSON array of tasks
   upstaff_calNextId   — integer counter
   upstaff_taskNextId  — integer counter
   upstaff_gcal_signed — '1' if user authorised Google Calendar before
   upstaff_gcal_count  — last known synced event count (UI display only)
   upstaff_calendars   — JSON array of discovered Google Calendar entries
══════════════════════════════════════════════ */
const LS_KEYS = {
  CAL: "upstaff_calEvents",
  TASKS: "upstaff_tasks",
  CAL_ID: "upstaff_calNextId",
  TASK_ID: "upstaff_taskNextId",
  GCAL_AUTH: "upstaff_gcal_signed",
  GCAL_COUNT: "upstaff_gcal_count",
  CALENDARS: "upstaff_calendars",
};

/* ── Active user email — used to scope per-user gcal data ── */
function getActiveUserEmail() {
  try {
    const p = JSON.parse(localStorage.getItem("upstaff_profile") || "{}");
    return (p.email || "default").toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
  } catch (_) {
    return "default";
  }
}
/* Per-user localStorage key helpers — each user's gcal data is isolated */
function getUserGcalAuthKey()  { return `upstaff_gcal_signed_${getActiveUserEmail()}`; }
function getUserCalendarsKey() { return `upstaff_calendars_${getActiveUserEmail()}`; }
function getUserGcalCountKey() { return `upstaff_gcal_count_${getActiveUserEmail()}`; }

/* ── Save to localStorage ───────────────────── */
function persistSave() {
  try {
    // Only persist LOCAL events — Google events are ephemeral and re-fetched on load
    const localOnly = calEvents.filter((e) => !e.isGoogleEvent);
    localStorage.setItem(LS_KEYS.CAL, JSON.stringify(localOnly));
    localStorage.setItem(LS_KEYS.TASKS, JSON.stringify(TASKS));
    localStorage.setItem(LS_KEYS.CAL_ID, String(calNextId));
    localStorage.setItem(LS_KEYS.TASK_ID, String(taskNextId));
    if (UPSTAFF_CALENDARS.length)
      localStorage.setItem(
        getUserCalendarsKey(),
        JSON.stringify(UPSTAFF_CALENDARS),
      );
    dbg(
      `[Persist] 💾 Saved ${localOnly.length} events, ${TASKS.length} tasks, ${UPSTAFF_CALENDARS.length} calendar(s)`,
    );
    // Update last-saved timestamp in UI
    const savedEl = document.getElementById("last-saved-indicator");
    if (savedEl) savedEl.textContent = "Saved at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    checkStorageQuota();
  } catch (e) {
    console.warn(
      "[Persist] ⚠️ localStorage write failed (storage full or blocked):",
      e,
    );
    if (e && (e.name === "QuotaExceededError" || e.code === 22)) {
      showToast("⚠️ Storage is full! Export your data now to avoid losing changes.", 8000);
    }
    // Update last-saved indicator with error state
    const savedEl = document.getElementById("last-saved-indicator");
    if (savedEl) savedEl.textContent = "Save failed — storage full";
    return;
  }
}

/* ── Load from localStorage ─────────────────── */
function persistLoad() {
  try {
    const rawCal = localStorage.getItem(LS_KEYS.CAL);
    const rawTasks = localStorage.getItem(LS_KEYS.TASKS);
    const rawCalId = localStorage.getItem(LS_KEYS.CAL_ID);
    const rawTaskId = localStorage.getItem(LS_KEYS.TASK_ID);
    const rawCals = localStorage.getItem(getUserCalendarsKey());

    try {
      if (rawCal) calEvents = JSON.parse(rawCal);
      if (rawTasks) TASKS = JSON.parse(rawTasks);
      if (rawCalId) calNextId = parseInt(rawCalId, 10) || 200;
      if (rawTaskId) taskNextId = parseInt(rawTaskId, 10) || 100;
      if (rawCals) UPSTAFF_CALENDARS = JSON.parse(rawCals);
    } catch (e) {
      console.error("[Persist] ❌ Corrupted saved data, resetting:", e);
      calEvents = [];
      TASKS = [];
      UPSTAFF_CALENDARS = [];
    }
    // Migrate: ensure every task has assignees[], comments[], activity[], attachments[]
    TASKS.forEach((t) => {
      if (!t.assignees) t.assignees = t.assignee ? [t.assignee] : ["Assistant"];
      if (!t.assignee) t.assignee = t.assignees[0] || "Assistant";
      if (!t.comments) t.comments = [];
      if (!t.activity) t.activity = [];
      if (!t.attachments) t.attachments = [];
      if (!t.stage_history) t.stage_history = [];
    });

    dbg(
      `[Persist] ✅ Restored ${calEvents.length} event(s), ${TASKS.length} task(s), ${UPSTAFF_CALENDARS.length} calendar(s)`,
    );

    // Session expiry is handled by verifySession() on load (with auto silent re-login)
  } catch (e) {
    console.warn("[Persist] ⚠️ localStorage read failed — starting fresh:", e);
    calEvents = [];
    TASKS = [];
  }
}

/* ── Wipe calendar from localStorage ───────── */
function persistClearCalendar() {
  try {
    localStorage.removeItem(LS_KEYS.CAL);
    localStorage.removeItem(LS_KEYS.CAL_ID);
    localStorage.removeItem(getUserGcalCountKey());
    localStorage.removeItem(getUserCalendarsKey());
  } catch (e) {
    console.warn("[Persist] ⚠️ Could not clear calendar storage:", e);
  }
  UPSTAFF_CALENDARS = [];
}

/* ── Wipe everything from localStorage ──────── */
function persistClearAll() {
  Object.values(LS_KEYS).forEach((k) => localStorage.removeItem(k));
  // Also wipe user-scoped gcal keys for the current user
  localStorage.removeItem(getUserGcalAuthKey());
  localStorage.removeItem(getUserCalendarsKey());
  localStorage.removeItem(getUserGcalCountKey());
}

/* ── Hydrate on script parse (before first render) ── */
persistLoad();

/* ══════════════════════════════════════════════
   OVERDUE FLAG — _markOverdueTasks  (formerly autoProgressStatuses)
   NOTE: This function does NOT change pipeline stages.
   It only sets t._overdue = true on tasks whose due date
   has passed. Stage advancement (Applied → Screening → …)
   is always recruiter-driven and never happens automatically.
   Safe to call before every render — runs in O(n).
══════════════════════════════════════════════ */
function _markOverdueTasks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  TASKS.forEach((t) => {
    if (TERMINAL_STAGES.includes(t.status)) return;
    if (!t.due) return;
    const due = new Date(t.due + "T00:00");
    if (due < today) t._overdue = true;
  });
}
// Legacy alias so any existing call sites keep working
function autoProgressStatuses() { _markOverdueTasks(); }

/* ══════════════════════════════════════════════
   STAGE PROGRESS BAR HELPER
   Renders a 5-step progress bar for the
   To Do → In Progress → In Review → Done flow.
══════════════════════════════════════════════ */
/* ── Recruitment Pipeline order ─────────────────────────────────────────── */
const STAGE_ORDER = [
  "New",
  "For Interview",
  "Interviewed",
  "For Client Endorsement",
  "Hired",
];
const TERMINAL_STAGES = ["Hired", "Closed"];
const ACTIVE_STAGES = [
  "New",
  "For Interview",
  "Interviewed",
  "For Client Endorsement",
];
const CLOSED_STATUSES = [
  "Closed", "Rejected", "Cancelled", "Not Qualified",
  "No Show", "Duplicate Lead", "Hired - Resigned",
];
const OTHERS_STATUSES = [
  "For Future Consideration", "Could be Revisited", "Open for other Roles",
];
const LIST_STATUS_ORDER = [
  // Active pipeline
  "New", "For Interview", "Interviewed", "For Client Endorsement", "Hired",
  // Post-hire
  "Hired - Resigned",
  // On hold
  "For Future Consideration", "Could be Revisited", "Open for other Roles",
  // Closed
  "Not Qualified", "Rejected", "No Show", "Duplicate Lead", "Closed",
];

/* ── Assessment config: which tests each position type requires ─────────── */
const ASSESSMENT_CONFIG = {
  // Data-entry / typing-heavy roles
  "Data Entry": ["typing", "knowledge"],
  Encoder: ["typing", "knowledge"],
  "Intake Caller": ["verbal", "knowledge", "interview"],
  // Customer-facing
  CSR: ["verbal", "knowledge", "interview"],
  "Customer Support": ["verbal", "interview"],
  // Technical / specialist
  "Google Ads Specialist": ["knowledge", "interview"],
  "Digital Marketing": ["knowledge", "interview"],
  // Leadership
  "Team Leader": ["knowledge", "verbal", "interview"],
  "HR Assistant": ["knowledge", "interview"],
  // Default fallback
  _default: ["knowledge", "interview"],
};

function getAssessmentConfig(position) {
  if (!position) return ASSESSMENT_CONFIG["_default"];
  const exact = ASSESSMENT_CONFIG[position];
  if (exact) return exact;
  // Fuzzy match
  const lower = position.toLowerCase();
  for (const [key, val] of Object.entries(ASSESSMENT_CONFIG)) {
    if (key !== "_default" && lower.includes(key.toLowerCase())) return val;
  }
  return ASSESSMENT_CONFIG["_default"];
}

/* ── Pipeline progression helpers ──────────────────────────────────────── */
function getNextStage(currentStatus) {
  const idx = STAGE_ORDER.indexOf(currentStatus);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

function moveApplicantToStage(taskId, newStage, opts = {}) {
  const t = TASKS.find((x) => x.id === taskId);
  if (!t) return;
  const oldStage = t.status;

  // Stage history audit log
  if (!t.stage_history) t.stage_history = [];
  let _histBy = "HR Admin";
  try {
    const _p = JSON.parse(localStorage.getItem("upstaff_profile") || "{}");
    if (_p.firstName) _histBy = (_p.firstName + " " + (_p.lastName || "")).trim();
  } catch (_) {}
  t.stage_history.push({ from: oldStage, to: newStage, at: new Date().toISOString(), by: _histBy });

  t.status = newStage;
  t.stage_changed_at = new Date().toISOString();

  if (newStage === "Hired") {
    t.hired_at = new Date().toISOString();
    t.archived = false;
    showToast(
      `🎉 ${t.name.split(" — ")[1] || t.name} hired! Moving to Onboarding.`,
    );
    // Auto-create onboarding employee record
    _autoCreateEmployee(t);
  } else if (oldStage === "Hired" && !TERMINAL_STAGES.includes(newStage)) {
    // Moved back from Hired — soft-flag the onboarding record instead of deleting it
    // This preserves checklist progress and docs if re-hired later
    const emp = EMPLOYEES.find(
      (e) =>
        (e.source_task_id && e.source_task_id === t.id) ||
        (e.fname + " " + e.lname).toLowerCase().trim() ===
          (t.applicant_name || t.name.split(" — ")[1] || t.name)
            .toLowerCase()
            .trim(),
    );
    if (emp) {
      emp.status = "Pending";
      emp._returned_from_hired = true; // soft flag — record kept but marked as returned
      empPersistSave();
    }
    t.hired_at = "";
    showToast(
      `↩️ Applicant returned to ${newStage}. Onboarding record preserved.`,
    );
  } else if (newStage === "Closed") {
    t.rejected_at = new Date().toISOString();
    t.archived = true;
    showToast(`Applicant moved to Closed and archived.`);
  } else {
    showToast(`✅ Moved to ${newStage}`);
  }

  // Log activity & notify
  logActivity(taskId, "stage_change", `${oldStage} → ${newStage}`);
  pushNotif("stage", `${t.applicant_name || t.name} moved to ${newStage}`, taskId);
  persistSave();
  if (!opts.silent) refreshCurrentView();
  dbg(`[Pipeline] Task #${taskId} "${t.name}": ${oldStage} → ${newStage}`);
  // Sync status back to partner API (fire-and-forget)
  if (window.UpstaffAPI && t._source === "api") {
    UpstaffAPI.syncStatusToApi(t, newStage).then((resolvedPartnerStatus) => {
      if (resolvedPartnerStatus) {
        // Update partner_status locally so badge and future syncs stay consistent
        t.partner_status = resolvedPartnerStatus;
        persistSave();
        dbg(`[API] Status synced: ${t.name} → ${resolvedPartnerStatus}`);
      }
    });
  }
  // Sync Google Calendar event title/status if one exists for this task
  if (typeof gcalSignedIn !== "undefined" && gcalSignedIn && t.gcalEventId &&
      typeof _taskSyncToGcal === "function") {
    _taskSyncToGcal(t).catch((e) =>
      console.warn("[GCal] Stage sync failed:", e.message)
    );
  }
}

function advanceToNextStage(taskId) {
  const t = TASKS.find((x) => x.id === taskId);
  if (!t) return;
  const next = getNextStage(t.status);
  if (!next) {
    showToast("This applicant is already at the final active stage.");
    return;
  }
  moveApplicantToStage(taskId, next);
}

async function hireApplicant(taskId) {
  if (
    !(await uiConfirm("This will move them to Onboarding.", {
      icon: "🎉",
      title: "Mark as Hired?",
      okText: "Yes, Hire",
    }))
  )
    return;
  moveApplicantToStage(taskId, "Hired");
}

async function rejectApplicant(taskId) {
  const reason = await _pickRejectionReason();
  if (reason === null) return;
  if (
    !(await uiConfirm(`Reason: "${reason}". They will be archived.`, {
      icon: "🚫",
      title: "Reject Applicant?",
      okText: "Reject",
      okDanger: true,
    }))
  )
    return;
  const t = TASKS.find((x) => x.id === taskId);
  if (t) t.rejection_reason = reason;
  moveApplicantToStage(taskId, "Closed");
}

/* Auto-creates an onboarding employee when a candidate is Hired */
function _autoCreateEmployee(t) {
  const nameParts = (
    t.applicant_name ||
    t.name.split(" — ")[1] ||
    t.name
  ).split(" ");
  const resolvedName = (t.applicant_name || t.name.split(" — ")[1] || t.name)
    .toLowerCase()
    .trim();

  // Dedup: match by task id first (most reliable), then fall back to name
  const existing = EMPLOYEES.find(
    (e) =>
      (e.source_task_id && e.source_task_id === t.id) ||
      (e.fname + " " + e.lname).toLowerCase().trim() === resolvedName,
  );
  if (existing) {
    // Already exists — update position/contact info in case it changed, but keep status/checklist/docs
    existing.position = t.position || existing.position;
    existing.email = t.applicant_email || existing.email;
    existing.phone = t.applicant_phone || existing.phone;
    existing.manager = t.assignee || existing.manager;
    // Sync Drive Folder link only if not already set
    if (t.drive_folder_link && !existing.driveLink) {
      existing.driveLink = t.drive_folder_link;
    }
    empPersistSave();
    return;
  }

  const checklist = DEFAULT_CHECKLIST.map((item) => ({ item, done: false }));
  const docs = DOC_TYPES.map((dt) => ({ ...dt, uploaded: false, link: "" }));

  EMPLOYEES.push({
    id: empNextId ? empNextId++ : Date.now(),
    source_task_id: t.id, // links back to the recruitment task — used for dedup
    fname: nameParts[0] || "",
    lname: nameParts.slice(1).join(" ") || "",
    position: t.position || "",
    emptype: "Probationary",
    start: new Date().toISOString().slice(0, 10),
    status: "Pending",
    email: t.applicant_email || "",
    phone: t.applicant_phone || "",
    manager: t.assignee || "Assistant",
    driveLink: t.drive_folder_link || "", // carry over folder link from recruitment
    notes:
      `Auto-created from recruitment pipeline. ${t.interview_notes || ""}`.trim(),
    checklist,
    docs,
  });
  empPersistSave(); // persist immediately so data survives a refresh
}
function buildStageProgress(status) {
  const isClosed = CLOSED_STATUSES.includes(status) || status === "Cancelled";
  const idx = isClosed ? -1 : STAGE_ORDER.indexOf(status);
  const items = STAGE_ORDER.map((s, i) => {
    let cls = "";
    let icon = `<span style="font-size:8px;font-weight:700;">${i + 1}</span>`;
    if (isClosed) {
      cls = "ss-cancelled";
    } else if (i < idx) {
      cls = "ss-done";
      icon = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (i === idx) {
      cls = "ss-active";
    }
    const connectorCls = isClosed ? "ss-connector-cancelled" : i < idx ? "ss-connector-done" : i === idx ? "ss-connector-active" : "";
    const connector = i < STAGE_ORDER.length - 1 ? `<div class="ss-connector ${connectorCls}"></div>` : "";
    const shortLabel = s.replace("For Client Endorsement", "Endorsed").replace("For Interview", "Interview");
    return `<div class="ss-item ${cls}"><div class="ss-node">${icon}</div><div class="ss-label">${shortLabel}</div></div>${connector}`;
  }).join("");
  const statusLabel = isClosed
    ? `<span class="ss-status-badge ss-badge-closed">${status}</span>`
    : idx === -1
      ? `<span class="ss-status-badge">${status}</span>`
      : `<span class="ss-status-badge ss-badge-active">${status} · ${idx + 1}/${STAGE_ORDER.length}</span>`;
  return `<div class="stage-stepper-wrap">
    <div class="stage-stepper-header"><span class="ss-label-pipeline">Pipeline</span>${statusLabel}</div>
    <div class="stage-stepper">${items}</div>
  </div>`;
}

/* Calendar sub-view & date */
const STATUS_COLORS = {
  Scheduled: "#44D7E9",
  Completed: "#43E97B",
  Rescheduled: "#FA8231",
  Cancelled: "#9CA3AF",
};
let calView = "month";
let calDate = new Date();

/* ══════════════════════════════════════════════
   DYNAMIC CALENDAR REGISTRY
   Populated from Google Calendar API after sign-in.
   Persisted to localStorage so the list survives page refresh.
   No hardcoded IDs — the system auto-discovers all calendars.
══════════════════════════════════════════════ */

/* Color palette assigned in order to discovered calendars */
const CALENDAR_COLOR_PALETTE = [
  "#44D7E9",
  "#6C63FF",
  "#43E97B",
  "#FA8231",
  "#FF6584",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

/* Calendar visibility (hidden = unchecked in sidebar) */
let hiddenCalendars = new Set();

/* ── Helper: get a calendar config object by ID ── */
function getCalConfig(calendarId) {
  return UPSTAFF_CALENDARS.find((c) => c.calendarId === calendarId) || null;
}

/* ── Helper: get display color for any event ── */
function getEventColor(ev) {
  const calId = ev.calendarId || ev.sourceCalendar;
  if (calId) {
    const cal = getCalConfig(calId);
    if (cal) return cal.color;
  }
  return STATUS_COLORS[ev.status] || "#44D7E9";
}

/* ── Helper: get calendar name for display ── */
function getCalName(calendarId) {
  const cal = getCalConfig(calendarId);
  return cal
    ? cal.calendarName
    : calendarId?.split("@")[0] || "Unknown Calendar";
}

/* ── Positions list (used by Settings) ── */
let POSITIONS = [...JOB_POSITIONS];


/* ── Team members (used by Settings) — loaded from localStorage ── */
const DEFAULT_MEMBERS = [
  { name: "Assistant", role: "Assistant", email: "assistant@upstaff.com", color: "#44d7e9" },
  { name: "Manager",   role: "Manager",   email: "manager@upstaff.com",   color: "#6c63ff" },
];
let MEMBERS = (() => {
  try {
    const raw = localStorage.getItem("upstaff_members");
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return DEFAULT_MEMBERS.map((m) => ({ ...m }));
})();
function saveMembers() {
  try { localStorage.setItem("upstaff_members", JSON.stringify(MEMBERS)); } catch (_) {}
}

/* ── Notification store ── */
const LS_NOTIFS_KEY = "upstaff_notifs";
let NOTIFS = (() => {
  try { const r = localStorage.getItem(LS_NOTIFS_KEY); return r ? JSON.parse(r) : []; } catch (_) { return []; }
})();
let _notifIdCtr = NOTIFS.length ? Math.max(...NOTIFS.map((n) => n.id)) + 1 : 1;
function saveNotifs() {
  try { localStorage.setItem(LS_NOTIFS_KEY, JSON.stringify(NOTIFS)); } catch (_) {}
}
function pushNotif(type, msg, taskId = null) {
  const n = { id: _notifIdCtr++, type, msg, taskId, read: false, createdAt: new Date().toISOString() };
  NOTIFS.unshift(n);
  if (NOTIFS.length > 50) NOTIFS.length = 50; // cap
  saveNotifs();
  _updateNotifBadge();
  // Browser Notification API
  if (Notification.permission === "granted") {
    new Notification("Upstaff", { body: msg, icon: "css/Logo-Footer.png" });
  } else if (Notification.permission === "default") {
    Notification.requestPermission().then((p) => {
      if (p === "granted") new Notification("Upstaff", { body: msg, icon: "css/Logo-Footer.png" });
    });
  }
}
function _updateNotifBadge() {
  const badge = document.getElementById("notif-badge");
  const unread = NOTIFS.filter((n) => !n.read).length;
  if (!badge) return;
  badge.textContent = unread;
  badge.style.display = unread > 0 ? "flex" : "none";
}

/* ══════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════ */
function showToast(msg, duration) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  if (window.gsap) {
    t.style.display = "block";
    gsap.fromTo(t, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.4)" });
    setTimeout(() => {
      gsap.to(t, { opacity: 0, y: 10, duration: 0.2, onComplete: () => {
        t.style.display = "none";
        gsap.set(t, { clearProps: "all" });
      }});
    }, duration || 2800);
  } else {
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), duration || 2800);
  }
}
/* ── Custom Dialog Helpers (replaces native alert/confirm) ── */
function _showDialog({
  icon = "",
  title = "",
  msg = "",
  okText = "OK",
  okDanger = false,
  showCancel = false,
  cancelText = "Cancel",
}) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("upstaff-dialog");
    if (!overlay) { resolve(false); return; }
    const iconEl = document.getElementById("upstaff-dialog-icon");
    const titleEl = document.getElementById("upstaff-dialog-title");
    const msgEl = document.getElementById("upstaff-dialog-msg");
    const okBtn = document.getElementById("upstaff-dialog-ok");
    const cancelBtn = document.getElementById("upstaff-dialog-cancel");
    if (!okBtn || !cancelBtn) { resolve(false); return; }
    if (iconEl) iconEl.textContent = icon;
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = msg;
    okBtn.textContent = okText;
    okBtn.style.background = okDanger ? "#ef4444" : "var(--cyan)";
    cancelBtn.style.display = showCancel ? "" : "none";
    cancelBtn.textContent = cancelText;
    overlay.style.display = "flex";
    const cleanup = (result) => {
      overlay.style.display = "none";
      const newOk = okBtn.cloneNode(true);
      const newCancel = cancelBtn.cloneNode(true);
      okBtn.parentNode.replaceChild(newOk, okBtn);
      cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
      resolve(result);
    };
    document
      .getElementById("upstaff-dialog-ok")
      .addEventListener("click", () => cleanup(true));
    document
      .getElementById("upstaff-dialog-cancel")
      .addEventListener("click", () => cleanup(false));
  });
}
function uiAlert(msg, { icon = "ℹ️", title = "Notice" } = {}) {
  return _showDialog({ icon, title, msg, showCancel: false });
}
function uiConfirm(
  msg,
  { icon = "❓", title = "Confirm", okText = "Confirm", okDanger = false } = {},
) {
  return _showDialog({ icon, title, msg, okText, okDanger, showCancel: true });
}

/* ── Rejection Reason Picker ─────────────────── */
const REJECTION_REASONS = [
  "Failed Assessment",
  "Salary Mismatch",
  "No-show",
  "Overqualified",
  "Position Closed",
  "Other",
];

function _pickRejectionReason() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `
      <div style="background:var(--surface-1);border:1px solid var(--border);border-radius:14px;padding:24px 24px 20px;min-width:320px;max-width:420px;width:90%;box-shadow:0 8px 40px rgba(0,0,0,.3);font-family:'Montserrat',sans-serif;">
        <div style="font-size:22px;margin-bottom:8px;">🚫</div>
        <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">Rejection Reason</div>
        <div style="font-size:12.5px;color:var(--muted);margin-bottom:16px;line-height:1.5;">Select a reason before archiving this applicant.</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:18px;">
          ${REJECTION_REASONS.map((r) =>
            `<button class="rr-option" data-reason="${r}" style="text-align:left;padding:9px 14px;border-radius:9px;border:1px solid var(--border);background:var(--surface-3);color:var(--text);font-size:12.5px;font-weight:500;cursor:pointer;font-family:'Montserrat',sans-serif;transition:background 0.15s,border-color 0.15s;">${r}</button>`
          ).join("")}
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button id="rr-cancel" style="padding:8px 18px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:13px;font-weight:600;cursor:pointer;font-family:'Montserrat',sans-serif;">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll(".rr-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        overlay.querySelectorAll(".rr-option").forEach((b) => {
          b.style.background = "var(--surface-3)";
          b.style.borderColor = "var(--border)";
          b.style.color = "var(--text)";
        });
        btn.style.background = "var(--cyan)";
        btn.style.borderColor = "var(--cyan)";
        btn.style.color = "#fff";
        const reason = btn.dataset.reason;
        setTimeout(() => { document.body.removeChild(overlay); resolve(reason); }, 220);
      });
    });
    overlay.querySelector("#rr-cancel").addEventListener("click", () => {
      document.body.removeChild(overlay);
      resolve(null);
    });
  });
}

/* ── Storage quota check ─────────────────────── */
let _quotaWarnedSession = false;
function checkStorageQuota() {
  try {
    const bytes = new Blob([JSON.stringify(localStorage)]).size;
    const MB = bytes / (1024 * 1024);
    const pct = Math.round((MB / 5) * 100);
    // Update storage bar in Settings if visible
    const bar = document.getElementById("storage-usage-bar");
    const label = document.getElementById("storage-usage-label");
    if (bar) bar.style.width = Math.min(pct, 100) + "%";
    if (bar) bar.style.background = pct > 85 ? "#ef4444" : pct > 65 ? "#fa8231" : "var(--cyan)";
    if (label) label.textContent = `${MB.toFixed(2)} MB used (~${pct}% of 5 MB)`;
    if (pct > 85) {
      showToast("⚠️ Storage nearly full! Consider exporting & clearing old data.");
    } else if (pct > 65 && !_quotaWarnedSession) {
      _quotaWarnedSession = true;
      showToast("💾 Storage is over 65% full. Keep an eye on it.");
    }
  } catch (_) {}
}

/* ── Activity log helper ─────────────────────── */
let _actIdCtr = Date.now();
function logActivity(taskId, action, detail = "") {
  const t = TASKS.find((x) => x.id === taskId);
  if (!t) return;
  if (!t.activity) t.activity = [];
  // Get current user name from profile or default
  let byName = "HR Admin";
  try {
    const p = JSON.parse(localStorage.getItem("upstaff_profile") || "{}");
    if (p.firstName) byName = (p.firstName + " " + (p.lastName || "")).trim();
  } catch (_) {}
  t.activity.push({ id: _actIdCtr++, action, by: byName, at: new Date().toISOString(), detail });
  persistSave();
}

/* ── Cross-tab data sync (storage event) ─────── */
window.addEventListener("storage", function onStorageSync(e) {
  const watchedKeys = Object.values(LS_KEYS).concat(["upstaff_todos", "upstaff_employees", "upstaff_notifs"]);
  if (!e.key || !watchedKeys.includes(e.key)) return;
  // Reload affected data slices
  try {
    if (e.key === LS_KEYS.TASKS && e.newValue) {
      TASKS = JSON.parse(e.newValue);
      TASKS.forEach((t) => {
        if (!t.assignees) t.assignees = t.assignee ? [t.assignee] : ["Assistant"];
        if (!t.comments) t.comments = [];
        if (!t.activity) t.activity = [];
        if (!t.attachments) t.attachments = [];
      });
    }
    if (e.key === LS_KEYS.CAL && e.newValue) {
      const local = JSON.parse(e.newValue);
      calEvents = [...local, ...calEvents.filter((ev) => ev.isGoogleEvent)];
    }
    if (e.key === LS_NOTIFS_KEY && e.newValue) {
      NOTIFS = JSON.parse(e.newValue);
      _updateNotifBadge();
    }
  } catch (_) {}
  refreshCurrentView();
  showToast("🔄 Data synced from another tab.");
});

function showCalToast(msg) {
  const t = document.getElementById("cal-toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}
function initials(s) {
  return s
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function avatarColor(s) {
  let h = 0;
  for (let c of s) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}
function dueCls(d) {
  if (!d) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  if (dd < today) return "overdue";
  if (dd.toDateString() === today.toDateString()) return "today";
  return "";
}
function fmtDue(d) {
  if (!d) return "—";
  const dd = new Date(d);
  return dd.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function todayStr() {
  return fmtDate(new Date());
}

/* ══════════════════════════════════════════════
   SIDEBAR COLLAPSE
══════════════════════════════════════════════ */
document.getElementById("toggle-btn")?.addEventListener("click", () => {
  const sb   = document.getElementById("sidebar");
  const icon = document.getElementById("toggle-icon");
  const isCollapsing = !sb.classList.contains("collapsed");
  sb.classList.toggle("collapsed");
  if (window.gsap) {
    if (isCollapsing) {
      gsap.to(sb,   { width: 64,  duration: 0.3, ease: "power2.inOut", onComplete: () => gsap.set(sb, { clearProps: "width" }) });
      gsap.to(icon, { rotation: 180, duration: 0.3, ease: "power2.inOut" });
    } else {
      gsap.to(sb,   { width: 220, duration: 0.3, ease: "power2.inOut", onComplete: () => gsap.set(sb, { clearProps: "width" }) });
      gsap.to(icon, { rotation: 0,   duration: 0.3, ease: "power2.inOut" });
    }
    // Enable / disable Tippy tooltips based on collapsed state
    document.querySelectorAll(".nav-item").forEach(el => {
      if (isCollapsing) el._tippy?.enable();
      else el._tippy?.disable();
    });
  } else {
    icon.style.transform = sb.classList.contains("collapsed") ? "rotate(180deg)" : "";
  }
});

/* ══════════════════════════════════════════════
   APP STATE MANAGER
   Simple centralized state with subscriber pattern.
   Usage:
     AppState.set('currentView', 'board')
     AppState.get('currentView')
     AppState.subscribe('currentView', (val) => console.log(val))
══════════════════════════════════════════════ */
const AppState = (() => {
  const _state = {};
  const _subscribers = {};

  return {
    get(key) {
      return _state[key];
    },
    set(key, value) {
      const prev = _state[key];
      _state[key] = value;
      if (_subscribers[key]) {
        _subscribers[key].forEach((fn) => {
          try {
            fn(value, prev);
          } catch (e) {
            console.warn("[AppState] subscriber error:", key, e);
          }
        });
      }
    },
    subscribe(key, fn) {
      if (!_subscribers[key]) _subscribers[key] = [];
      _subscribers[key].push(fn);
      // Return unsubscribe function
      return () => {
        _subscribers[key] = _subscribers[key].filter((f) => f !== fn);
      };
    },
    snapshot() {
      return { ..._state };
    },
  };
})();

/* ══════════════════════════════════════════════
   SETTINGS DANGER ACTIONS
   Extracted from inline HTML onclick handlers
══════════════════════════════════════════════ */
function handleClearTasks() {
  const typed = prompt('This will permanently delete ALL applicants and tasks.\nType DELETE to confirm:');
  if (typed === null) return; // cancelled
  if (typed.trim().toUpperCase() !== "DELETE") {
    showToast("Cancelled — you must type DELETE to confirm.");
    return;
  }
  TASKS = [];
  persistSave();
  refreshCurrentView();
  showToast("🗑️ All tasks deleted.");
}

function handleClearCalendar() {
  const typed = prompt('This will permanently delete ALL calendar events.\nType DELETE to confirm:');
  if (typed === null) return;
  if (typed.trim().toUpperCase() !== "DELETE") {
    showToast("Cancelled — you must type DELETE to confirm.");
    return;
  }
  calEvents = [];
  UPSTAFF_CALENDARS = [];
  remindersFired.clear();
  persistClearCalendar();
  populateCalendarSelectors();
  renderCalendarSidebar();
  renderSettingsCalendarList();
  renderCalendar();
  showToast("🗑️ Calendar cleared.");
}

function handleWipeStorage() {
  const typed = prompt(
    "This will permanently delete ALL data — applicants, calendar events, settings, and Google auth.\nThis CANNOT be undone.\n\nType DELETE to confirm:"
  );
  if (typed === null) return;
  if (typed.trim().toUpperCase() !== "DELETE") {
    showToast("Cancelled — you must type DELETE to confirm.");
    return;
  }
  persistClearAll();
  calEvents = [];
  TASKS = [];
  UPSTAFF_CALENDARS = [];
  remindersFired.clear();
  gcalSignedIn = false;
  populateCalendarSelectors();
  renderCalendarSidebar();
  renderSettingsCalendarList();
  renderCalendar();
  refreshCurrentView();
  showToast("🗑️ All localStorage cleared.");
}

/* ══════════════════════════════════════════════
   DELEGATED EVENT HANDLER
   Replaces inline onclick= on static HTML elements.
   Dynamic template-literal HTML keeps its own onclick.
══════════════════════════════════════════════ */
document.addEventListener("click", function (e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const arg = btn.dataset.arg;

  switch (action) {
    // Navigation
    case "switchView":
      switchView(arg);
      break;
    case "listPageChange":
      listPageChange(Number(arg));
      break;

    // GCal
    case "handleGCalSync":
      handleGCalSync();
      break;
    case "navigateToCalendarsSettings":
      navigateToCalendarsSettings();
      break;

    // Onboarding
    case "filterOnboarding":
      filterOnboarding();
      break;
    case "openHireModal":
      openHireModal();
      break;

    // Todo
    case "openTodoModal":
      openTodoModal(arg ? Number(arg) : null);
      break;
    case "setTodoFilter":
      setTodoFilter(arg, btn);
      break;
    case "closeTodoModal":
      closeTodoModal();
      break;
    case "saveTodo":
      saveTodo();
      break;

    // Settings toasts (placeholder actions)
    case "toastProfileSaved":
      showToast("✅ Profile saved!");
      break;
    case "toastPasswordUpdated":
      showToast("🔒 Password updated!");
      break;
    case "toastWorkspaceSaved":
      showToast("✅ Workspace settings saved!");
      break;
    case "toastInviteSent":
      showToast("📧 Invite sent!");
      break;
    case "toastNotifSaved":
      showToast("🔔 Notification preferences saved!");
      break;
    case "toastPhotoUpload":
      showToast("📷 Photo upload coming soon!");
      break;

    // Settings actions
    case "handleCreateCalendar":
      handleCreateCalendar();
      break;
    case "renderPublicCalendars":
      renderPublicCalendars();
      break;
    case "subscribeCustomExtCalendar":
      subscribeCustomExtCalendar();
      break;
    case "refreshStorageStatus":
      refreshStorageStatus();
      break;
    case "exportDataJSON":
      exportDataJSON();
      break;
    case "importDataJSON":
      document.getElementById("import-data-file").click();
      break;
    case "exportAnalyticsCSV":
      exportAnalyticsCSV();
      break;

    // Danger zone
    case "handleClearTasks":
      handleClearTasks();
      break;
    case "handleClearCalendar":
      handleClearCalendar();
      break;
    case "resetDemoData":
      resetDemoData();
      break;
    case "handleWipeStorage":
      handleWipeStorage();
      break;

    // Candidates
    case "switchCandidateFolder":
      switchCandidateFolder(arg, btn);
      break;

    // Modal pipeline buttons
    case "advanceStageAndClose":
      if (window._editingTaskId) {
        advanceToNextStage(window._editingTaskId);
        closeTaskModal();
      }
      break;
    case "hireAndClose":
      if (window._editingTaskId) {
        hireApplicant(window._editingTaskId);
        closeTaskModal();
      }
      break;
    case "rejectAndClose":
      if (window._editingTaskId) {
        rejectApplicant(window._editingTaskId);
        closeTaskModal();
      }
      break;
    case "switchModalTab":
      _switchModalTab(arg, btn);
      break;

    // Assessment
    case "sendAssessmentEmail":
      sendAssessmentEmail();
      break;
    case "resendAssessmentEmail":
      resendAssessmentEmail();
      break;
    case "resetAssessmentAttempt":
      resetAssessmentAttempt();
      break;
    case "applyPendingAssessment":
      applyPendingAssessment();
      break;
    case "copyAssessmentLink":
      copyAssessmentLink();
      break;
    case "saveGCalApiCredentials":
      saveGCalApiConfig();
      break;

    // Interview tab
    case "setIvPlatform":
      setIvPlatform(arg, btn);
      break;
    case "generateIvMeetingLink":
      generateIvMeetingLink();
      break;
    case "openIvPlatform":
      openIvPlatform();
      break;
    case "saveInterviewSchedule":
      saveInterviewSchedule();
      break;

    // Meeting platform (calendar modal)
    case "setMeetingPlatform":
      setMeetingPlatform(arg, btn);
      break;
    case "generateMeetingLink":
      generateMeetingLink();
      break;
    case "openMeetingPlatform":
      openMeetingPlatform();
      break;

    // Hire modal
    case "closeHireModal":
      closeHireModal();
      break;
    case "saveNewHire":
      saveNewHire();
      break;

    // Employee detail modal
    case "closeEmpDetailDirect":
      closeEmpDetailDirect();
      break;
    case "toastEmailSent":
      showToast("📧 Welcome email sent!");
      break;
    case "openEmpEdit":
      openEmpEdit(_empDetailId);
      break;
    case "saveEmpDetailChanges":
      saveEmpDetailChanges();
      break;

    // Reminder
    case "reminderViewEvent":
      reminderViewEvent();
      break;
    case "dismissReminder":
      dismissReminder();
      break;

    // Members CRUD
    case "addMember":
      addMemberForm();
      break;
    case "editMember":
      editMemberForm(Number(arg));
      break;
    case "removeMember":
      removeMemberAction(Number(arg));
      break;

    // Notifications
    case "toggleNotifPanel":
      toggleNotifPanel();
      break;
    case "markAllNotifsRead":
      markAllNotifsRead();
      break;
    case "dismissNotif":
      dismissNotif(Number(arg));
      break;

    // Activity / Comments
    case "postComment":
      postComment();
      break;

    // File attachments
    case "triggerFileInput":
      document.getElementById("file-attach-input")?.click();
      break;
    case "deleteAttachment":
      deleteAttachment(Number(arg));
      break;
  }
});

/* ══════════════════════════════════════════════
   MEMBER CRUD FUNCTIONS
══════════════════════════════════════════════ */
const MEMBER_COLORS = ["#6c63ff","#44d7e9","#43e97b","#fa8231","#ff6584","#f59e0b","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];
const MEMBER_ROLES  = ["HR Manager","Recruiter","Reviewer","Interviewer","Admin","Administrator"];

async function addMemberForm() {
  const name  = (prompt("Full name of new member:") || "").trim();
  if (!name) return;
  const role  = (prompt(`Role (${MEMBER_ROLES.join(", ")}):`) || "Recruiter").trim();
  const email = (prompt("Email address:") || "").trim();
  const colorIdx = MEMBERS.length % MEMBER_COLORS.length;
  MEMBERS.push({ name, role, email: email || `${name.toLowerCase().replace(/\s+/g,".")}@upstaff.com`, color: MEMBER_COLORS[colorIdx] });
  saveMembers();
  if (typeof renderMembersList === "function") renderMembersList();
  if (typeof _rebuildAssigneeOptions === "function") _rebuildAssigneeOptions();
  showToast(`✅ ${name} added to team!`);
}

async function editMemberForm(idx) {
  const m = MEMBERS[idx];
  if (!m) return;
  const name  = (prompt("Full name:", m.name) || "").trim();
  if (!name) return;
  const role  = (prompt(`Role (${MEMBER_ROLES.join(", ")}):`, m.role) || m.role).trim();
  const email = (prompt("Email:", m.email) || m.email).trim();
  MEMBERS[idx] = { ...m, name, role, email };
  saveMembers();
  if (typeof renderMembersList === "function") renderMembersList();
  if (typeof _rebuildAssigneeOptions === "function") _rebuildAssigneeOptions();
  showToast(`✅ ${name} updated!`);
}

async function removeMemberAction(idx) {
  const m = MEMBERS[idx];
  if (!m) return;
  if (!(await uiConfirm(`Remove "${m.name}" from the team?`, { icon: "🗑️", title: "Remove Member?", okText: "Remove", okDanger: true }))) return;
  MEMBERS.splice(idx, 1);
  saveMembers();
  if (typeof renderMembersList === "function") renderMembersList();
  if (typeof _rebuildAssigneeOptions === "function") _rebuildAssigneeOptions();
  showToast("🗑️ Member removed.");
}

/* ══════════════════════════════════════════════
   NOTIFICATION PANEL FUNCTIONS
══════════════════════════════════════════════ */
function toggleNotifPanel() {
  const panel = document.getElementById("notif-panel");
  if (!panel) return;
  const isOpen = panel.classList.contains("open");
  if (isOpen) {
    if (window.gsap) {
      gsap.to(panel, { opacity: 0, y: -8, duration: 0.15, ease: "power2.in", onComplete: () => {
        panel.classList.remove("open");
        gsap.set(panel, { clearProps: "opacity,y" });
      }});
    } else {
      panel.classList.remove("open");
    }
  } else {
    panel.classList.add("open");
    if (typeof renderNotifPanel === "function") renderNotifPanel();
    // Mark all as read when opened
    NOTIFS.forEach((n) => (n.read = true));
    saveNotifs();
    _updateNotifBadge();
    if (window.gsap) {
      gsap.fromTo(panel, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" });
    }
  }
}

function markAllNotifsRead() {
  NOTIFS.forEach((n) => (n.read = true));
  saveNotifs();
  _updateNotifBadge();
  if (typeof renderNotifPanel === "function") renderNotifPanel();
}

function dismissNotif(id) {
  const idx = NOTIFS.findIndex((n) => n.id === id);
  if (idx > -1) { NOTIFS.splice(idx, 1); saveNotifs(); }
  if (typeof renderNotifPanel === "function") renderNotifPanel();
  _updateNotifBadge();
}

// Request browser notification permission on load
if (typeof Notification !== "undefined" && Notification.permission === "default") {
  Notification.requestPermission();
}

// Update badge on load
setTimeout(_updateNotifBadge, 500);

/* ══════════════════════════════════════════════
   COMMENT FUNCTIONS
══════════════════════════════════════════════ */
function postComment() {
  const textarea = document.getElementById("comment-input");
  if (!textarea) return;
  const text = textarea.value.trim();
  if (!text) return showToast("⚠️ Comment cannot be empty.");
  const taskId = window._editingTaskId;
  if (!taskId) return;
  const t = TASKS.find((x) => x.id === taskId);
  if (!t) return;
  if (!t.comments) t.comments = [];
  let byName = "HR Admin";
  try {
    const p = JSON.parse(localStorage.getItem("upstaff_profile") || "{}");
    if (p.firstName) byName = (p.firstName + " " + (p.lastName || "")).trim();
  } catch (_) {}
  t.comments.push({ id: _actIdCtr++, author: byName, text, createdAt: new Date().toISOString() });
  logActivity(taskId, "comment", `${byName} commented`);
  textarea.value = "";
  if (typeof renderActivityTab === "function") renderActivityTab(t);
}

/* ══════════════════════════════════════════════
   FILE ATTACHMENT FUNCTIONS
══════════════════════════════════════════════ */
const MAX_FILE_SIZE_MB = 1;
const MAX_FILES_PER_TASK = 5;
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
// localStorage quota safety threshold (4.5 MB — leaves headroom for other data)
const LS_QUOTA_SAFETY_BYTES = 4.5 * 1024 * 1024;

function _getLocalStorageUsedBytes() {
  let total = 0;
  try {
    for (const k in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, k)) {
        total += (localStorage[k].length + k.length) * 2; // UTF-16 chars = 2 bytes each
      }
    }
  } catch (_) {}
  return total;
}

function handleFileAttach(input) {
  const taskId = window._editingTaskId;
  if (!taskId) return showToast("⚠️ Save the task first, then attach files.");
  const t = TASKS.find((x) => x.id === taskId);
  if (!t) return;
  if (!t.attachments) t.attachments = [];
  const files = Array.from(input.files);
  if (!files.length) return;
  if (t.attachments.length + files.length > MAX_FILES_PER_TASK) {
    return showToast(`⚠️ Max ${MAX_FILES_PER_TASK} files per task.`);
  }
  let processed = 0;
  files.forEach((file) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      showToast(`⚠️ "${file.name}" is not an allowed file type — skipped.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      showToast(`⚠️ "${file.name}" exceeds ${MAX_FILE_SIZE_MB} MB limit — skipped.`);
      return;
    }
    // Pre-flight quota check: base64 encoding inflates size by ~1.37x
    const estimatedBase64Bytes = Math.ceil(file.size * 1.37);
    if (_getLocalStorageUsedBytes() + estimatedBase64Bytes > LS_QUOTA_SAFETY_BYTES) {
      showToast(`⚠️ Storage nearly full — cannot attach "${file.name}". Export your data to free space.`, 7000);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      let byName = "HR Admin";
      try { const p = JSON.parse(localStorage.getItem("upstaff_profile") || "{}"); if (p.firstName) byName = (p.firstName + " " + (p.lastName || "")).trim(); } catch (_) {}
      t.attachments.push({ id: _actIdCtr++, name: file.name, type: file.type, size: file.size, dataUrl: ev.target.result, uploadedAt: new Date().toISOString(), uploadedBy: byName });
      logActivity(taskId, "attachment", `Attached "${file.name}"`);
      processed++;
      if (processed === files.filter((f) => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024).length) {
        if (typeof renderFilesTab === "function") renderFilesTab(t);
        showToast(`✅ ${processed} file(s) attached!`);
      }
    };
    reader.readAsDataURL(file);
  });
  input.value = "";
}

async function deleteAttachment(attachId) {
  const taskId = window._editingTaskId;
  if (!taskId) return;
  const t = TASKS.find((x) => x.id === taskId);
  if (!t || !t.attachments) return;
  const idx = t.attachments.findIndex((a) => a.id === attachId);
  if (idx === -1) return;
  if (!(await uiConfirm(`Delete "${t.attachments[idx].name}"?`, { icon: "🗑️", title: "Delete File?", okText: "Delete", okDanger: true }))) return;
  const name = t.attachments[idx].name;
  t.attachments.splice(idx, 1);
  logActivity(taskId, "attachment_deleted", `Deleted "${name}"`);
  if (typeof renderFilesTab === "function") renderFilesTab(t);
  showToast("🗑️ File deleted.");
}

/* ══════════════════════════════════════════════
   KEYBOARD SHORTCUTS
   Esc  → close the topmost open modal
   Enter → save the active modal form (when focus is not in a textarea)
══════════════════════════════════════════════ */
document.addEventListener("keydown", function (e) {
  // Esc: close topmost visible modal
  if (e.key === "Escape") {
    const modalIds = [
      { id: "task-modal-overlay",   closeFn: "closeTaskModal" },
      { id: "todo-modal-overlay",   closeFn: "closeTodoModal" },
      { id: "hire-modal-overlay",   closeFn: "closeHireModal" },
      { id: "cal-modal-overlay",    closeFn: null, btnId: "cal-modal-cancel-btn" },
      { id: "search-modal-overlay", closeFn: null, btnId: "search-modal-close" },
    ];
    for (const m of modalIds) {
      const el = document.getElementById(m.id);
      if (el && el.classList.contains("open")) {
        if (m.closeFn && typeof window[m.closeFn] === "function") {
          window[m.closeFn]();
        } else if (m.btnId) {
          const btn = document.getElementById(m.btnId);
          if (btn) btn.click();
        }
        e.preventDefault();
        break;
      }
    }
    // Also close settings panel if open
    const settingsOverlay = document.getElementById("settings-overlay");
    if (settingsOverlay && settingsOverlay.classList.contains("open")) {
      settingsOverlay.classList.remove("open");
      e.preventDefault();
    }
  }

  // Enter: save active modal form (not when in textarea/select/input[type=text] that isn't a search)
  if (e.key === "Enter" && !e.shiftKey) {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "TEXTAREA") return; // allow newlines in textareas
    if (tag === "SELECT") return;   // allow select navigation

    // Applicant modal save
    const taskModal = document.getElementById("task-modal-overlay");
    if (taskModal && taskModal.classList.contains("open")) {
      const saveBtn = document.getElementById("btn-task-save");
      if (saveBtn) { saveBtn.click(); e.preventDefault(); }
      return;
    }
    // Todo modal save
    const todoModal = document.getElementById("todo-modal-overlay");
    if (todoModal && todoModal.classList.contains("open")) {
      const saveBtn = todoModal.querySelector(".btn-save");
      if (saveBtn) { saveBtn.click(); e.preventDefault(); }
      return;
    }
  }
});

/* ══════════════════════════════════════════════
   MULTI-TAB CONFLICT DETECTION
   Warns the user if Upstaff is already open in
   another browser tab to prevent data overwrites.
══════════════════════════════════════════════ */
(function _initTabGuard() {
  try {
    if (typeof BroadcastChannel === "undefined") return;
    const _tabChannel = new BroadcastChannel("upstaff_tab_guard");
    // Listen for other tabs announcing themselves
    _tabChannel.onmessage = function (e) {
      if (e.data === "tab_opened") {
        showToast("⚠️ Upstaff is already open in another tab. Close it to avoid data conflicts.", 7000);
      }
    };
    // Announce this tab to any existing ones
    _tabChannel.postMessage("tab_opened");
  } catch (_) {}
})();

/* ══════════════════════════════════════════════
   GLOBAL ERROR HANDLER — catch unhandled promise rejections
══════════════════════════════════════════════ */
window.addEventListener("unhandledrejection", function (event) {
  const reason = event.reason;
  if (!reason) return;
  // Ignore network failures and known expected errors — these are already handled inline
  const msg = (reason.message || String(reason)).toLowerCase();
  if (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("load failed") ||
    msg.includes("access denied") ||
    msg.includes("not authorized") ||
    msg.includes("the user is not signed in") ||
    msg.includes("popup_closed") ||
    msg.includes("cancelled")
  ) return;
  console.error("[Unhandled Rejection]", reason);
  if (typeof showToast === "function") {
    showToast("⚠️ An unexpected error occurred. Please refresh if something looks wrong.", 5000);
  }
});
