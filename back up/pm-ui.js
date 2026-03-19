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
  Applied: { color: "#6c63ff", bg: "#ede9ff" },
  Screening: { color: "#44d7e9", bg: "#e0fafb" },
  Assessment: { color: "#f59e0b", bg: "#fef3c7" },
  Interview: { color: "#fa8231", bg: "#fff3e8" },
  Review: { color: "#a855f7", bg: "#f3e8ff" },
  Hired: { color: "#43e97b", bg: "#e8fdf1" },
  Rejected: { color: "#ef4444", bg: "#fee2e2" },
  Cancelled: { color: "#9ca3af", bg: "#f3f4f6" },
  // ── Legacy aliases (keeps old tasks rendering correctly) ──
  "To Do": { color: "#6c63ff", bg: "#ede9ff" },
  "In Progress": { color: "#44d7e9", bg: "#e0fafb" },
  "In Review": { color: "#a855f7", bg: "#f3e8ff" },
  Done: { color: "#43e97b", bg: "#e8fdf1" },
};

/** Returns the CSS class for a status pill — theme-aware, always readable */
function statusPillClass(status) {
  const map = {
    Applied: "sp-applied",
    Screening: "sp-screening",
    Assessment: "sp-assessment",
    Interview: "sp-interview",
    Review: "sp-review",
    Hired: "sp-hired",
    Rejected: "sp-rejected",
    Cancelled: "sp-cancelled",
    // Legacy aliases
    "To Do": "sp-applied",
    "In Progress": "sp-screening",
    "In Review": "sp-review",
    Done: "sp-hired",
  };
  return "status-pill " + (map[status] || "sp-applied");
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
  "Ready to Call",
  "Ready to Hire",
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

/* ── Seed task data ── */
const _SEED_TASKS_UNUSED_REMOVED = [
  {
    id: 1,
    name: "Maria Santos",
    status: "Screening",
    priority: "High",
    position: "Intake Caller",
    assignee: "HR Team",
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
    assignee: "HR Team",
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
    assignee: "HR Team",
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
    assignee: "HR Team",
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
    assignee: "HR Team",
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
        LS_KEYS.CALENDARS,
        JSON.stringify(UPSTAFF_CALENDARS),
      );
    dbg(
      `[Persist] 💾 Saved ${localOnly.length} events, ${TASKS.length} tasks, ${UPSTAFF_CALENDARS.length} calendar(s)`,
    );
  } catch (e) {
    console.warn(
      "[Persist] ⚠️ localStorage write failed (storage full or blocked):",
      e,
    );
  }
}

/* ── Load from localStorage ─────────────────── */
function persistLoad() {
  try {
    const rawCal = localStorage.getItem(LS_KEYS.CAL);
    const rawTasks = localStorage.getItem(LS_KEYS.TASKS);
    const rawCalId = localStorage.getItem(LS_KEYS.CAL_ID);
    const rawTaskId = localStorage.getItem(LS_KEYS.TASK_ID);
    const rawCals = localStorage.getItem(LS_KEYS.CALENDARS);

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

    dbg(
      `[Persist] ✅ Restored ${calEvents.length} event(s), ${TASKS.length} task(s), ${UPSTAFF_CALENDARS.length} calendar(s)`,
    );
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
    localStorage.removeItem(LS_KEYS.GCAL_COUNT);
    localStorage.removeItem(LS_KEYS.CALENDARS);
  } catch (e) {
    console.warn("[Persist] ⚠️ Could not clear calendar storage:", e);
  }
  UPSTAFF_CALENDARS = [];
}

/* ── Wipe everything from localStorage ──────── */
function persistClearAll() {
  Object.values(LS_KEYS).forEach((k) => localStorage.removeItem(k));
}

/* ── Hydrate on script parse (before first render) ── */
persistLoad();

/* ══════════════════════════════════════════════
   AUTO STATUS PROGRESSION
   Checks each applicant's due date against today.
   If the due date has passed and the task is still
   active (not Done / Cancelled), marks it Done.
   Safe to call before every render — runs in O(n).
══════════════════════════════════════════════ */
function autoProgressStatuses() {
  // In the recruitment pipeline we do NOT auto-advance stages — stage progression
  // is intentional (recruiter-driven). We only auto-flag severely overdue active tasks.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  TASKS.forEach((t) => {
    if (TERMINAL_STAGES.includes(t.status)) return;
    if (!t.due) return;
    const due = new Date(t.due + "T00:00");
    if (due < today) t._overdue = true;
  });
}

/* ══════════════════════════════════════════════
   STAGE PROGRESS BAR HELPER
   Renders a 5-step progress bar for the
   To Do → In Progress → In Review → Done flow.
══════════════════════════════════════════════ */
/* ── Recruitment Pipeline order ─────────────────────────────────────────── */
const STAGE_ORDER = [
  "Applied",
  "Screening",
  "Assessment",
  "Interview",
  "Review",
  "Hired",
];
const TERMINAL_STAGES = ["Hired", "Rejected", "Cancelled"];
const ACTIVE_STAGES = [
  "Applied",
  "Screening",
  "Assessment",
  "Interview",
  "Review",
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
  } else if (newStage === "Rejected") {
    t.rejected_at = new Date().toISOString();
    t.archived = true;
    showToast(`Applicant moved to Rejected and archived.`);
  } else {
    showToast(`✅ Moved to ${newStage}`);
  }

  persistSave();
  refreshCurrentView();
  dbg(`[Pipeline] Task #${taskId} "${t.name}": ${oldStage} → ${newStage}`);
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
  if (
    !(await uiConfirm("They will be archived.", {
      icon: "🚫",
      title: "Reject Applicant?",
      okText: "Reject",
      okDanger: true,
    }))
  )
    return;
  moveApplicantToStage(taskId, "Rejected");
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
    dept: "",
    emptype: "Probationary",
    start: new Date().toISOString().slice(0, 10),
    status: "Pending",
    email: t.applicant_email || "",
    phone: t.applicant_phone || "",
    manager: t.assignee || "HR Team",
    notes:
      `Auto-created from recruitment pipeline. ${t.interview_notes || ""}`.trim(),
    checklist,
    docs,
  });
  empPersistSave(); // persist immediately so data survives a refresh
}
function buildStageProgress(status) {
  if (status === "Cancelled") {
    return `<div class="stage-progress-wrap">
      <div class="stage-progress-label"><span>Pipeline</span><span style="color:#9ca3af;">Cancelled</span></div>
      <div class="stage-steps">${STAGE_ORDER.map((s) => `<div class="stage-step s-cancelled" title="${s}"></div>`).join("")}</div>
    </div>`;
  }
  if (status === "Rejected") {
    return `<div class="stage-progress-wrap">
      <div class="stage-progress-label"><span>Pipeline</span><span style="color:#ef4444;">Rejected</span></div>
      <div class="stage-steps">${STAGE_ORDER.map((s) => `<div class="stage-step s-rejected" title="${s}"></div>`).join("")}</div>
    </div>`;
  }
  const idx = STAGE_ORDER.indexOf(status);
  const steps = STAGE_ORDER.map((s, i) => {
    const cls = i < idx ? "s-done" : i === idx ? "s-active" : "";
    return `<div class="stage-step ${cls}" title="${s}"></div>`;
  }).join("");
  const pct =
    idx === -1 ? 0 : Math.round((idx / (STAGE_ORDER.length - 1)) * 100);
  const stageLabel =
    idx === -1 ? status : `${status} (${idx + 1}/${STAGE_ORDER.length})`;
  return `<div class="stage-progress-wrap">
    <div class="stage-progress-label"><span>Pipeline</span><span style="color:var(--cyan);">${stageLabel}</span></div>
    <div class="stage-steps">${steps}</div>
    <div class="stage-names">${STAGE_ORDER.map((s, i) => `<span class="${i === idx ? "stage-name-active" : ""}">${s}</span>`).join("")}</div>
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

/* ── Team members (used by Settings) ── */
const MEMBERS = [
  {
    name: "Ana Reyes",
    role: "HR Manager",
    email: "ana@upstaff.com",
    color: "#6c63ff",
  },
  {
    name: "HR Team",
    role: "Recruiter",
    email: "hr@upstaff.com",
    color: "#44d7e9",
  },
  {
    name: "Marketing",
    role: "Reviewer",
    email: "mkt@upstaff.com",
    color: "#fa8231",
  },
  {
    name: "CEO Office",
    role: "Admin",
    email: "ceo@upstaff.com",
    color: "#ff6584",
  },
  {
    name: "HR Panel",
    role: "Interviewer",
    email: "panel@upstaff.com",
    color: "#43e97b",
  },
];

/* ══════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════ */
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
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
    document.getElementById("upstaff-dialog-icon").textContent = icon;
    document.getElementById("upstaff-dialog-title").textContent = title;
    document.getElementById("upstaff-dialog-msg").textContent = msg;
    const okBtn = document.getElementById("upstaff-dialog-ok");
    const cancelBtn = document.getElementById("upstaff-dialog-cancel");
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
document.getElementById("toggle-btn").addEventListener("click", () => {
  const sb = document.getElementById("sidebar");
  sb.classList.toggle("collapsed");
  const icon = document.getElementById("toggle-icon");
  icon.style.transform = sb.classList.contains("collapsed")
    ? "rotate(180deg)"
    : "";
});

/* ══════════════════════════════════════════════
   VIEW SWITCHING  — project views + settings
══════════════════════════════════════════════ */
const PROJECT_VIEWS = ["list", "board", "calendar", "table", "mytasks"];

/**
 * switchView(v) — switches between the 5 project board views.
 * Called by the view-tab buttons and by the sidebar Calendar link.
 */
function switchView(v) {
  // Show view bar, hide settings, analytics, candidates, todos
  document.getElementById("view-bar").style.display = "";
  document.getElementById("view-settings").style.display = "none";
  document.getElementById("view-analytics").style.display = "none";
  document.getElementById("view-candidates").style.display = "none";
  document.getElementById("view-onboarding").style.display = "none";

  document.getElementById("topbar-filter-btn").style.display = "";

  // Update tab active state
  document
    .querySelectorAll(".view-tab")
    .forEach((t) => t.classList.toggle("active", t.dataset.view === v));

  // Show/hide project view panels (includes mytasks panel)
  PROJECT_VIEWS.forEach((id) => {
    const panelId = id === "mytasks" ? "view-todos" : "view-" + id;
    const el = document.getElementById(panelId);
    if (el) el.style.display = id === v ? "block" : "none";
  });

  // Update topbar breadcrumb
  const labels = {
    list: "Interview Pipeline",
    board: "Kanban Board",
    calendar: "Interview Calendar",
    table: "Data Table",
    mytasks: "My Tasks",
  };
  document.getElementById("crumb-current").textContent = labels[v] || v;
  document.getElementById("crumb-parent").textContent = "Recruitment";

  // Show/hide Add Task button
  document.getElementById("btn-add-task").style.display =
    v === "calendar" || v === "mytasks" ? "none" : "";

  // Render content
  if (v === "list") renderList();
  else if (v === "board") renderBoard();
  else if (v === "calendar") renderCalendar();
  else if (v === "table") renderTable();
  else if (v === "mytasks") renderTodos();
}

/**
 * showSettings() — shows the Settings panel (not a project view).
 */
function showSettings() {
  // Hide all project view panels (includes mytasks/view-todos via PROJECT_VIEWS)
  PROJECT_VIEWS.forEach((id) => {
    const panelId = id === "mytasks" ? "view-todos" : "view-" + id;
    const el = document.getElementById(panelId);
    if (el) el.style.display = "none";
  });
  document.getElementById("view-analytics").style.display = "none";
  document.getElementById("view-candidates").style.display = "none";
  document.getElementById("view-onboarding").style.display = "none";

  document
    .querySelectorAll(".view-tab")
    .forEach((t) => t.classList.remove("active"));

  // Hide view-bar, show settings
  document.getElementById("view-bar").style.display = "none";
  document.getElementById("view-settings").style.display = "block";

  // Update breadcrumb
  document.getElementById("crumb-parent").textContent = "upstaff";
  document.getElementById("crumb-current").textContent = "Settings";
  document.getElementById("btn-add-task").style.display = "none";

  // Render dynamic content inside settings
  renderMembersList();
  renderPositionsList();
  refreshStorageStatus();
  renderSettingsCalendarList();
  renderPublicCalendars();
  populateEmailJSSettings();
}

/* ── localStorage status display ── */
function refreshStorageStatus() {
  const el = document.getElementById("storage-status-rows");
  if (!el) return;

  const localCount = calEvents.filter((e) => !e.isGoogleEvent).length;
  const googleCount = calEvents.filter((e) => e.isGoogleEvent).length;
  const wasSignedIn = localStorage.getItem(LS_KEYS.GCAL_AUTH) === "1";

  function statusRow(icon, label, value, ok = true) {
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:10px;background:var(--surface-3);border:1px solid var(--border);">
      <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;color:var(--muted);">${icon} ${label}</div>
      <span style="font-size:12px;font-weight:700;color:${ok ? "var(--text)" : "#ef4444"};">${value}</span>
    </div>`;
  }

  const calCount = UPSTAFF_CALENDARS.length;
  el.innerHTML = [
    statusRow(
      "📋",
      "Local interview events saved",
      `${localCount} event${localCount !== 1 ? "s" : ""}`,
      true,
    ),
    statusRow(
      "☁️",
      "Google Calendar events (session)",
      `${googleCount} event${googleCount !== 1 ? "s" : ""} — re-fetched on load`,
      true,
    ),
    statusRow(
      "🗓️",
      "Calendars connected",
      calCount
        ? `${calCount} calendar${calCount !== 1 ? "s" : ""}`
        : "None — sync to discover",
      calCount > 0,
    ),
    statusRow(
      "📝",
      "Tasks saved",
      `${TASKS.length} task${TASKS.length !== 1 ? "s" : ""}`,
      true,
    ),
    statusRow(
      "🔑",
      "Google Calendar auth",
      wasSignedIn ? "Stored — will auto-reconnect" : "Not signed in",
      wasSignedIn,
    ),
    statusRow(
      "🆔",
      "Next event ID / task ID",
      `${calNextId} / ${taskNextId}`,
      true,
    ),
  ].join("");
}

/* View tab clicks */
document
  .querySelectorAll(".view-tab")
  .forEach((t) =>
    t.addEventListener("click", () => switchView(t.dataset.view)),
  );

/* Sidebar nav item clicks */
document.querySelectorAll(".nav-item").forEach((b) => {
  b.addEventListener("click", () => {
    document
      .querySelectorAll(".nav-item")
      .forEach((x) => x.classList.remove("active"));
    b.classList.add("active");

    const space = b.dataset.space;

    if (space === "recruitment") {
      // Go back to the project board (List view) under Recruitment
      switchView("list");
    } else if (space === "onboarding") {
      showOnboarding();
    } else if (space === "calendar-nav") {
      switchView("calendar");
    } else if (space === "candidates") {
      showCandidates();
    } else if (space === "analytics") {
      showAnalytics();
    } else if (space === "settings") {
      showSettings();
    }
  });
});

/* ══════════════════════════════════════════════
   LIST VIEW — REVAMPED
══════════════════════════════════════════════ */
const PRIORITY_ORDER = { Urgent: 4, High: 3, Medium: 2, Low: 1 };

/* ── Status tab + pagination state ── */
let listActiveStatus = "";
let listCurrentPage = 1;
const LIST_PAGE_SIZE = 20;

function setListStatusTab(status) {
  listActiveStatus = status;
  listCurrentPage = 1;
  renderList();
}

function listPageChange(dir) {
  listCurrentPage += dir;
  renderList();
}

function renderListStatusTabs() {
  const allStatuses = [
    "Applied",
    "Screening",
    "Assessment",
    "Interview",
    "Review",
    "Hired",
    "Rejected",
    "Cancelled",
  ];
  const tabsEl = document.getElementById("list-status-tabs");
  if (!tabsEl) return;
  const tabs = [
    { label: "All", value: "" },
    ...allStatuses.map((s) => ({ label: s, value: s })),
  ];
  tabsEl.innerHTML = tabs
    .map((t) => {
      const count =
        t.value === ""
          ? TASKS.length
          : TASKS.filter((x) => x.status === t.value).length;
      const isActive = listActiveStatus === t.value;
      return `<button class="list-status-tab${isActive ? " active" : ""}" onclick="setListStatusTab('${t.value}')">
      ${t.label}
      <span class="tab-count">${count}</span>
    </button>`;
    })
    .join("");
}

function getListFilters() {
  return {
    search: (document.getElementById("list-search")?.value || "").toLowerCase(),
    status: listActiveStatus,
    priority: document.getElementById("list-filter-priority")?.value || "",
    position: document.getElementById("list-filter-position")?.value || "",
    assignee: document.getElementById("list-filter-assignee")?.value || "",
    sort: document.getElementById("list-sort")?.value || "due-asc",
  };
}

function renderList() {
  autoProgressStatuses(); // auto-mark past-due tasks as Done before rendering
  const f = getListFilters();

  // Filter
  let tasks = TASKS.filter((t) => {
    if (
      f.search &&
      !t.name.toLowerCase().includes(f.search) &&
      !t.position.toLowerCase().includes(f.search) &&
      !(t.assignee || "").toLowerCase().includes(f.search)
    )
      return false;
    if (f.status && t.status !== f.status) return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (f.position && t.position !== f.position) return false;
    if (f.assignee && t.assignee !== f.assignee) return false;
    return true;
  });

  // Sort within each group
  function sortTasks(arr) {
    return arr.sort((a, b) => {
      switch (f.sort) {
        case "due-asc":
          return (a.due || "9999") < (b.due || "9999") ? -1 : 1;
        case "due-desc":
          return (a.due || "") > (b.due || "") ? -1 : 1;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "priority-desc":
          return (
            (PRIORITY_ORDER[b.priority] || 0) -
            (PRIORITY_ORDER[a.priority] || 0)
          );
        case "created-desc":
          return b.id - a.id;
        default:
          return 0;
      }
    });
  }

  // Stats bar
  const allTasks = TASKS;
  const overdueCount = allTasks.filter(
    (t) => dueCls(t.due) === "overdue" && !TERMINAL_STAGES.includes(t.status),
  ).length;
  const todayCount = allTasks.filter(
    (t) => dueCls(t.due) === "today" && t.status !== "Hired",
  ).length;
  const doneCount = allTasks.filter((t) => t.status === "Hired").length;
  const totalCount = allTasks.length;
  const statsEl = document.getElementById("list-stats-bar");
  if (statsEl)
    statsEl.innerHTML = `
    <div class="list-stat-chip"><span class="stat-val">${totalCount}</span>&nbsp;Total Applicants</div>
    <div class="list-stat-chip overdue-chip"><span class="stat-val">${overdueCount}</span>&nbsp;Overdue</div>
    <div class="list-stat-chip today-chip"><span class="stat-val">${todayCount}</span>&nbsp;Interview Today</div>
    <div class="list-stat-chip done-chip"><span class="stat-val">${doneCount}</span>&nbsp;Hired</div>
  `;

  // Active filter tags
  const tagsEl = document.getElementById("list-active-tags");
  const activeTags = [];
  if (f.status)
    activeTags.push({ label: `Status: ${f.status}`, key: "status" });
  if (f.priority)
    activeTags.push({ label: `Priority: ${f.priority}`, key: "priority" });
  if (f.position)
    activeTags.push({ label: `Position: ${f.position}`, key: "position" });
  if (f.assignee)
    activeTags.push({ label: `Assignee: ${f.assignee}`, key: "assignee" });
  if (f.search) activeTags.push({ label: `"${f.search}"`, key: "search" });
  if (tagsEl) {
    tagsEl.style.display = activeTags.length ? "flex" : "none";
    tagsEl.innerHTML = activeTags.length
      ? activeTags
          .map(
            (
              tag,
            ) => `<span class="list-filter-tag" onclick="clearListFilter('${tag.key}')">
          ${tag.label} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </span>`,
          )
          .join("") +
        `<button class="clear-filters-btn" onclick="clearAllListFilters()">Clear all</button>`
      : "";
  }

  // Group by status
  const order = [...ACTIVE_STAGES, "Hired", "Rejected", "Cancelled"];
  const groups = {};
  tasks.forEach((t) => {
    if (!groups[t.status]) groups[t.status] = [];
    groups[t.status].push(t);
  });

  let html = "";
  let anySection = false;
  order.forEach((st) => {
    if (f.status && st !== f.status) return; // skip if filtered to one status
    const stTasks = sortTasks(groups[st] || []);
    const sm = STATUS_META[st];
    const allInStatus = TASKS.filter((t) => t.status === st).length;
    const donePct = st === "Done" ? 100 : 0;
    anySection = true;

    const sortIcons = {
      "due-asc": "↑",
      "due-desc": "↓",
      "name-asc": "A",
      "name-desc": "Z",
      "priority-desc": "!",
      "created-desc": "#",
    };

    html += `<div class="list-section">
      <div class="list-section-header" onclick="toggleSection(this)">
        <div class="list-section-left">
          <svg class="list-section-chevron open" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          <div class="list-section-dot" style="background:${sm.color};"></div>
          <span class="list-section-title" style="color:${sm.color}">${st}</span>
          <span class="list-section-count">${stTasks.length}${stTasks.length !== allInStatus ? `/${allInStatus}` : ""}</span>
        </div>
        ${stTasks.length > 0 ? `<div class="list-section-progress"><div class="list-section-progress-fill" style="width:${st === "Done" ? 100 : st === "Cancelled" ? 100 : Math.round((stTasks.length / Math.max(allInStatus, 1)) * 100)}%;background:${sm.color};"></div></div>` : ""}
      </div>
      <div class="list-section-body">
      <table class="list-table">
        <thead><tr>
          <th class="col-name" onclick="cycleSort('name')">Applicant ${f.sort.startsWith("name") ? sortIcons[f.sort] : ""}</th>
          <th class="col-position">Position</th>
          <th class="col-recruiter">Recruiter</th>
          <th class="col-intdate">Interview Date</th>
          <th class="col-status">Stage</th>
          <th class="col-scores">Scores</th>
          <th class="col-actions"></th>
        </tr></thead>
        <tbody>
          ${
            stTasks.length === 0
              ? `<tr><td colspan="7"><div class="list-empty-state">
            <div class="list-empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
            <div class="list-empty-title">No matching applicants</div>
            <div class="list-empty-sub">Try adjusting your filters</div>
          </div></td></tr>`
              : stTasks
                  .map((t) => {
                    const ac = avatarColor(t.assignee || "HR");
                    const folderTag = t.candidateFolder
                      ? `<span class="folder-tag">${t.candidateFolder === "Ready to Hire" ? "🎯" : t.candidateFolder === "Ready to Call" ? "📞" : "⭐"} ${t.candidateFolder}</span>`
                      : "";
                    // Stage mini progress bar
                    const stageIdx = STAGE_ORDER.indexOf(t.status);
                    const stageSteps = STAGE_ORDER.map((_, i) => {
                      const bg =
                        t.status === "Cancelled"
                          ? "#9ca3af"
                          : i < stageIdx
                            ? "var(--green)"
                            : i === stageIdx
                              ? "var(--cyan)"
                              : "var(--border)";
                      return `<div style="flex:1;height:3px;border-radius:99px;background:${bg};"></div>`;
                    }).join("");
                    const stageMini = `<div style="display:flex;gap:2px;margin-top:5px;">${stageSteps}</div>`;
                    // Interview date — find nearest upcoming (or last) matching calendar event
                    const appName = (
                      t.applicant_name ||
                      t.name ||
                      ""
                    ).toLowerCase();
                    const matchEvts = calEvents
                      .filter(
                        (e) =>
                          (e.applicant_name || e.name || "").toLowerCase() ===
                            appName && e.date,
                      )
                      .sort((a, b) => (a.date < b.date ? -1 : 1));
                    let intDateHTML = `<span class="list-int-none">—</span>`;
                    if (matchEvts.length) {
                      const today2 = new Date();
                      today2.setHours(0, 0, 0, 0);
                      const upcoming = matchEvts.find(
                        (e) => new Date(e.date + "T00:00") >= today2,
                      );
                      const target =
                        upcoming || matchEvts[matchEvts.length - 1];
                      const evtDate = new Date(target.date + "T00:00");
                      const isPast = evtDate < today2;
                      const cls = isPast
                        ? "list-int-past"
                        : "list-int-upcoming";
                      const timeStr =
                        target.time || target.start_time
                          ? fmtTime(target.time || target.start_time)
                          : "";
                      intDateHTML = `<div class="list-int-cell ${cls}">
                <span class="list-int-date">${fmtDue(target.date)}</span>
                ${timeStr ? `<span class="list-int-time">${timeStr}</span>` : ""}
              </div>`;
                    }
                    // Score badges
                    const scoreBadge = (label, val) => {
                      if (!val) return "";
                      const n = parseInt(val);
                      const cls =
                        n >= 85
                          ? "score-good"
                          : n >= 70
                            ? "score-ok"
                            : "score-low";
                      return `<span class="list-score-badge ${cls}">${label} ${val}%</span>`;
                    };
                    const scoresHTML = [
                      scoreBadge("K", t.knowledge_score),
                      scoreBadge("T", t.typing_score),
                      t.verbal_link
                        ? `<span class="list-score-badge score-good">V ✓</span>`
                        : "",
                    ]
                      .filter(Boolean)
                      .join("");
                    const rowCls =
                      t.status === "Hired"
                        ? "list-row-hired"
                        : t.status === "Cancelled" || t.status === "Rejected"
                          ? "list-row-cancelled"
                          : "";
                    const pc = PRIORITY_COLORS[t.priority] || "#9ca3af";
                    return `<tr class="${rowCls}" onclick="openTaskEdit(${t.id})">
              <td><div class="task-name-cell">
                <div class="task-check ${TERMINAL_STAGES.includes(t.status) ? "checked" : ""}" onclick="event.stopPropagation();toggleDone(${t.id})" title="Advance stage">
                  ${TERMINAL_STAGES.includes(t.status) ? `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>` : ""}
                </div>
                <div style="min-width:0;">
                  <div class="task-name ${t.status === "Hired" || t.status === "Done" ? "done" : t.status === "Cancelled" || t.status === "Rejected" ? "cancelled" : ""}">
                    ${sanitize(t.name)}${folderTag ? ` ${folderTag}` : ""}
                  </div>
                  <div style="display:flex;align-items:center;gap:5px;margin-top:2px;flex-wrap:wrap;">
                    ${t.notes ? `<span class="task-notes-preview">${sanitize(t.notes)}</span>` : ""}
                    ${t.gcalEventId ? `<span class="task-gcal-badge">☁️ GCal</span>` : ""}
                    <span class="priority-pill" style="background:${pc}22;color:${pc};font-size:10px;">${t.priority}</span>
                  </div>
                </div>
              </div></td>
              <td><span style="font-size:12px;color:var(--text);font-weight:500;line-height:1.4;">${sanitize(t.position) || "—"}</span></td>
              <td class="col-recruiter"><div class="assignee-chip"><div class="assignee-avatar" style="background:${ac};">${initials(t.assignee || "?")}</div><span style="font-size:12px;">${sanitize(t.assignee) || "—"}</span></div></td>
              <td class="col-intdate">${intDateHTML}</td>
              <td>
                <span class="${statusPillClass(t.status)}">${t.status}</span>
                ${stageMini}
              </td>
              <td class="col-scores"><div class="list-scores-cell">${scoresHTML || `<span style="font-size:11px;color:var(--light);">—</span>`}</div></td>
              <td onclick="event.stopPropagation()"><div class="list-row-actions">
                <button class="list-actions-btn" onclick="toggleListActionMenu(${t.id},this)" title="Actions">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg>
                </button>
                <div class="list-action-menu" id="lam-${t.id}">
                  <button class="lam-item" onclick="openTaskEdit(${t.id});closeAllListMenus()">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit Applicant
                  </button>
                  <button class="lam-item" onclick="listAdvanceStage(${t.id})">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    Advance Stage
                  </button>
                  ${
                    getPrevStage(t.status)
                      ? `<button class="lam-item" onclick="listRevertStage(${t.id})">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                    Move Back to ${getPrevStage(t.status)}
                  </button>`
                      : ""
                  }
                  <button class="lam-item" onclick="listScheduleInterview(${t.id})">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Schedule Interview
                  </button>
                  <div class="lam-sep"></div>
                  <button class="lam-item" onclick="openTaskEdit(${t.id},true);closeAllListMenus()">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    View Scores
                  </button>
                  <div class="lam-sep"></div>
                  <button class="lam-item lam-danger" onclick="listCancelApplicant(${t.id})">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    Cancel Application
                  </button>
                </div>
              </div></td>
            </tr>`;
                  })
                  .join("")
          }
          <tr class="add-task-row"><td colspan="7">
            <button class="add-task-btn" onclick="openTaskNew('${st}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
               Add applicant in ${st}
            </button>
          </td></tr>
        </tbody>
      </table>
      </div>
    </div>`;
  });

  if (!anySection)
    html = `<div class="list-empty-state" style="padding:60px 20px;">
    <div class="list-empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
    <div class="list-empty-title">No applicants found</div>
      <div class="list-empty-sub">No applicants yet — click <strong>+ Add Applicant</strong> in the top right to get started.</div>
  </div>`;

  // Render the fully-built html into the DOM
  document.getElementById("list-sections").innerHTML = html;

  // Pagination bar (page controls only — sections already rendered above)
  const allFiltered = tasks;
  const totalPages = Math.max(
    1,
    Math.ceil(allFiltered.length / LIST_PAGE_SIZE),
  );
  listCurrentPage = Math.min(Math.max(1, listCurrentPage), totalPages);

  const paginationEl = document.getElementById("list-pagination");
  const prevBtn = document.getElementById("pagination-prev");
  const nextBtn = document.getElementById("pagination-next");
  const infoEl = document.getElementById("pagination-info");
  if (paginationEl) {
    if (allFiltered.length > LIST_PAGE_SIZE) {
      paginationEl.style.display = "flex";
      prevBtn.disabled = listCurrentPage <= 1;
      nextBtn.disabled = listCurrentPage >= totalPages;
      infoEl.textContent = `Page ${listCurrentPage} of ${totalPages} (${allFiltered.length} applicants)`;
    } else {
      paginationEl.style.display = "none";
    }
  }

  // Render status tabs
  renderListStatusTabs();
}

function clearListFilter(key) {
  if (key === "search") {
    const el = document.getElementById("list-search");
    if (el) el.value = "";
  } else {
    const el = document.getElementById(`list-filter-${key}`);
    if (el) el.value = "";
  }
  renderList();
}
function clearAllListFilters() {
  [
    "list-filter-status",
    "list-filter-priority",
    "list-filter-position",
    "list-filter-assignee",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const s = document.getElementById("list-search");
  if (s) s.value = "";
  renderList();
}
function cycleSort(colKey) {
  const el = document.getElementById("list-sort");
  if (!el) return;
  const cur = el.value;
  if (colKey === "name")
    el.value = cur === "name-asc" ? "name-desc" : "name-asc";
  else el.value = cur === "due-asc" ? "due-desc" : "due-asc";
  renderList();
}

/* ── List view: Three-dot action menu helpers ── */
function toggleListActionMenu(taskId, btnEl) {
  const menu = document.getElementById("lam-" + taskId);
  if (!menu) return;
  const isOpen = menu.classList.contains("open");
  closeAllListMenus();
  if (!isOpen) {
    // Position the menu relative to the button using fixed coords
    const rect = btnEl.getBoundingClientRect();
    const menuW = 196; // min-width + border
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.left;

    // Prefer opening below-right; flip up if not enough space below
    const top = spaceBelow > 240 ? rect.bottom + 4 : rect.top - 4;
    const yDir = spaceBelow > 240 ? "top" : "bottom";
    const left = spaceRight > menuW ? rect.left : rect.right - menuW;

    menu.style.top = "";
    menu.style.bottom = "";
    menu.style[yDir] =
      (yDir === "top" ? top : window.innerHeight - rect.top + 4) + "px";
    menu.style.left = Math.max(4, left) + "px";
    menu.classList.add("open");

    // Close when clicking outside
    setTimeout(() => {
      document.addEventListener("click", _lamOutsideClick, { once: true });
    }, 0);
  }
}
function _lamOutsideClick(e) {
  if (!e.target.closest(".list-row-actions")) closeAllListMenus();
}
function closeAllListMenus() {
  document
    .querySelectorAll(".list-action-menu.open")
    .forEach((m) => m.classList.remove("open"));
}
// Also close menus on content scroll so they don't float out of sync
document
  .getElementById("content")
  ?.addEventListener("scroll", closeAllListMenus, { passive: true });

function listAdvanceStage(taskId) {
  closeAllListMenus();
  advanceToNextStage(taskId);
}

/** Returns the previous stage in STAGE_ORDER, or null if already at the first */
function getPrevStage(currentStatus) {
  const idx = STAGE_ORDER.indexOf(currentStatus);
  if (idx <= 0) return null;
  return STAGE_ORDER[idx - 1];
}

/** Revert an applicant to their previous pipeline stage */
async function listRevertStage(taskId) {
  closeAllListMenus();
  const t = TASKS.find((x) => x.id === taskId);
  if (!t) return;

  const prev = getPrevStage(t.status);
  if (!prev) {
    showToast("⚠️ Already at the first stage.");
    return;
  }

  const confirmed = await uiConfirm(
    "This will undo the last stage advancement.",
    { icon: "↩️", title: `Move back to "${prev}"?`, okText: "Move Back" },
  );
  if (!confirmed) return;

  const fromStage = t.status;
  t.status = prev;
  persistSave();
  renderList();
  showToast(
    `↩️ ${t.applicant_name || t.name} moved back to ${prev} (was ${fromStage})`,
  );
}

function listScheduleInterview(taskId) {
  closeAllListMenus();
  const t = TASKS.find((x) => x.id === taskId);
  if (!t) return;
  // Switch to calendar view and open the add modal pre-filled
  switchView("calendar");
  setTimeout(() => {
    // openNewAt is the correct calendar modal opener
    openNewAt(fmtDate(new Date()), "09:00");
    // Pre-fill applicant name and position
    setTimeout(() => {
      const nameEl = document.getElementById("cal-f-name");
      const posEl = document.getElementById("cal-f-position");
      if (nameEl) nameEl.value = t.applicant_name || t.name || "";
      if (posEl && t.position) {
        const opt = [...posEl.options].find((o) => o.value === t.position);
        if (opt) posEl.value = t.position;
      }
    }, 80);
  }, 350);
}

function listCancelApplicant(taskId) {
  closeAllListMenus();
  const t = TASKS.find((x) => x.id === taskId);
  if (!t) return;
  if (t.status === "Cancelled") {
    showToast("Already cancelled.");
    return;
  }
  t.status = "Cancelled";
  persistSave();
  renderList();
  showToast(`❌ ${t.name} marked as Cancelled`);
}

function populateListPositionFilter() {
  const el = document.getElementById("list-filter-position");
  if (!el) return;
  const cur = el.value;
  el.innerHTML =
    '<option value="">All Positions</option>' +
    JOB_POSITIONS.map((p) => `<option value="${p}">${p}</option>`).join("");
  if (JOB_POSITIONS.includes(cur)) el.value = cur;
}

/* ══════════════════════════════════════════════
   POPULATE POSITION SELECTS — call after init & when positions change
══════════════════════════════════════════════ */
function renderPositionSelects() {
  const opts = JOB_POSITIONS.map(
    (p) => `<option value="${p}">${p}</option>`,
  ).join("");
  ["f-position", "cal-f-position"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const cur = el.value;
    el.innerHTML = opts;
    // Restore selection if still valid
    if ([...el.options].some((o) => o.value === cur)) el.value = cur;
    else el.value = JOB_POSITIONS[0];
  });
  // Also populate hire modal position select and list filter
  const hfPos = document.getElementById("hf-position");
  if (hfPos) hfPos.innerHTML = opts;
  populateListPositionFilter();
}

function toggleSection(hdr) {
  hdr.querySelector(".list-section-chevron").classList.toggle("open");
  const body = hdr.nextElementSibling;
  body.style.display = body.style.display === "none" ? "" : "none";
}
function toggleDone(id) {
  const t = TASKS.find((x) => x.id === id);
  if (!t) return;
  // In the recruitment pipeline, the check button advances or resets to Applied
  if (TERMINAL_STAGES.includes(t.status)) {
    t.status = "Applied";
  } else {
    advanceToNextStage(id);
    return;
  }
  persistSave();
  renderList();
}
document
  .getElementById("list-search")
  .addEventListener("input", debounce(renderList, 200));
document
  .getElementById("list-quickadd-input")
  ?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") listQuickAdd();
  });
document
  .getElementById("todo-quickadd-input")
  ?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") todoQuickAdd();
  });

/* ══════════════════════════════════════════════
   TODO SYSTEM — Personal Task Manager
   Persisted separately from recruitment TASKS.
══════════════════════════════════════════════ */
const TODO_CAT_COLORS = {
  Personal: "#6c63ff",
  Work: "#44d7e9",
  HR: "#fa8231",
  Recruitment: "#43e97b",
  Meeting: "#ff6584",
  "Follow-up": "#f59e0b",
};
const LS_KEY_TODOS = "upstaff_todos";
const LS_KEY_TODOID = "upstaff_todoNextId";
let TODOS = [];
let todoNextId = 1;
let _todoEditId = null;
let _todoFilter = "all";

(function todoLoad() {
  try {
    const raw = localStorage.getItem(LS_KEY_TODOS);
    const rawId = localStorage.getItem(LS_KEY_TODOID);
    if (raw) TODOS = JSON.parse(raw);
    if (rawId) todoNextId = parseInt(rawId, 10) || 1;
  } catch (e) {
    TODOS = [];
  }
})();

function todoSave() {
  try {
    localStorage.setItem(LS_KEY_TODOS, JSON.stringify(TODOS));
    localStorage.setItem(LS_KEY_TODOID, String(todoNextId));
  } catch (e) {
    dbg("[todoSave] localStorage write failed:", e);
  }
}
/* ── Show todos view (now via unified switchView) ── */
function showTodos() {
  // Route through the Recruitment view-bar system — My Tasks is now tab #5
  switchView("mytasks");
  // Highlight Recruitment in sidebar nav
  document
    .querySelectorAll(".nav-item")
    .forEach((x) => x.classList.remove("active"));
  const navRec = document.querySelector('.nav-item[data-space="recruitment"]');
  if (navRec) navRec.classList.add("active");
}

/* ── Filter ── */
function setTodoFilter(f, btnEl) {
  _todoFilter = f;
  document
    .querySelectorAll(".todo-filter-tab")
    .forEach((b) => b.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");
  renderTodos();
}

/* ── Render ── */
function renderTodos() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const filterPr = document.getElementById("todo-filter-priority")?.value || "";
  const filterCt = document.getElementById("todo-filter-category")?.value || "";

  // Stats
  const statsEl = document.getElementById("todo-stats-row");
  if (statsEl) {
    const tot = TODOS.length;
    const done = TODOS.filter((t) => t.completed).length;
    const ov = TODOS.filter(
      (t) => !t.completed && t.dueDate && new Date(t.dueDate) < today,
    ).length;
    const due = TODOS.filter(
      (t) =>
        !t.completed &&
        t.dueDate &&
        new Date(t.dueDate + "T00:00").toDateString() === today.toDateString(),
    ).length;
    statsEl.innerHTML = `
      <div class="todo-stat-chip"><span class="todo-stat-val">${tot}</span>Total</div>
      <div class="todo-stat-chip"><span class="todo-stat-val" style="color:var(--green);">${done}</span>Done</div>
      <div class="todo-stat-chip"><span class="todo-stat-val" style="color:#ef4444;">${ov}</span>Overdue</div>
      <div class="todo-stat-chip"><span class="todo-stat-val" style="color:var(--orange);">${due}</span>Due Today</div>
    `;
  }

  let todos = [...TODOS];
  if (_todoFilter === "active") todos = todos.filter((t) => !t.completed);
  if (_todoFilter === "completed") todos = todos.filter((t) => t.completed);
  if (_todoFilter === "overdue")
    todos = todos.filter(
      (t) => !t.completed && t.dueDate && new Date(t.dueDate) < today,
    );
  if (_todoFilter === "today")
    todos = todos.filter(
      (t) =>
        !t.completed &&
        t.dueDate &&
        new Date(t.dueDate + "T00:00").toDateString() === today.toDateString(),
    );
  if (filterPr) todos = todos.filter((t) => t.priority === filterPr);
  if (filterCt) todos = todos.filter((t) => t.category === filterCt);

  const container = document.getElementById("todo-list-container");
  if (!container) return;

  if (!todos.length) {
    container.innerHTML = `<div class="todo-empty">
      <div class="todo-empty-icon">✅</div>
      <div class="todo-empty-title">${_todoFilter === "completed" ? "No completed tasks yet" : _todoFilter === "overdue" ? "You're all caught up!" : _todoFilter === "today" ? "Nothing due today!" : "No tasks found"}</div>
      <div class="todo-empty-sub">${_todoFilter === "all" ? "Use the quick-add bar above to get started." : "Try a different filter."}</div>
    </div>`;
    return;
  }

  // Group into sections
  const G = { overdue: [], today: [], upcoming: [], nodate: [], completed: [] };
  todos.forEach((t) => {
    if (t.completed) {
      G.completed.push(t);
      return;
    }
    if (!t.dueDate) {
      G.nodate.push(t);
      return;
    }
    const dd = new Date(t.dueDate);
    if (dd < today) G.overdue.push(t);
    else if (dd.toDateString() === today.toDateString()) G.today.push(t);
    else G.upcoming.push(t);
  });

  const secs = [
    { key: "overdue", label: "⚠ Overdue", color: "#ef4444" },
    { key: "today", label: "🔥 Due Today", color: "#fa8231" },
    { key: "upcoming", label: "📅 Upcoming", color: "var(--cyan)" },
    { key: "nodate", label: "📌 No Due Date", color: "var(--muted)" },
    { key: "completed", label: "✅ Completed", color: "var(--green)" },
  ];

  let html = "";
  secs.forEach((sec) => {
    const items = G[sec.key];
    if (!items.length) return;
    // Sort by priority desc within section
    items.sort(
      (a, b) =>
        (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0),
    );
    html += `<div class="todo-section">
      <div class="todo-section-header">
        <span class="todo-section-label" style="color:${sec.color};">${sec.label}</span>
        <span class="todo-section-count">${items.length}</span>
      </div>
      ${items.map((t) => _buildTodoItemHTML(t, today)).join("")}
    </div>`;
  });

  container.innerHTML = html;
}

function _buildTodoItemHTML(t, today) {
  const pc = PRIORITY_COLORS[t.priority] || "#9ca3af";
  const cc = TODO_CAT_COLORS[t.category] || "var(--cyan)";
  let dueChip = "";
  if (t.dueDate) {
    const dd = new Date(t.dueDate);
    const timeStr = t.dueTime ? " · " + fmtTime(t.dueTime) : "";
    if (dd < today)
      dueChip = `<span class="todo-pill todo-due-overdue">⚠ ${fmtDue(t.dueDate)}${timeStr}</span>`;
    else if (dd.toDateString() === today.toDateString())
      dueChip = `<span class="todo-pill todo-due-today">🔥 Today${timeStr}</span>`;
    else
      dueChip = `<span class="todo-pill todo-due-upcoming">📅 ${fmtDue(t.dueDate)}${timeStr}</span>`;
  }
  return `<div class="todo-item ${t.completed ? "t-completed" : ""}">
    <div class="todo-check-box ${t.completed ? "t-done" : ""}" onclick="toggleTodoDone(${t.id})" title="${t.completed ? "Mark active" : "Mark done"}">
      ${t.completed ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>` : ""}
    </div>
    <div class="todo-item-body">
      <div class="todo-item-title">${sanitize(t.title)}</div>
      <div class="todo-item-meta">
        <span class="todo-pill" style="background:${pc}18;color:${pc};">${t.priority}</span>
        ${t.category ? `<span class="todo-pill todo-cat-pill" style="background:${cc}18;color:${cc};">${t.category}</span>` : ""}
        ${dueChip}
        ${t.gcalEventId ? '<span class="todo-gcal-badge">☁️ GCal</span>' : ""}
      </div>
      ${t.notes ? `<div class="todo-item-notes">${sanitize(t.notes)}</div>` : ""}
    </div>
    <div class="todo-item-actions">
      <button class="todo-item-edit-btn" onclick="openTodoModal(${t.id})">Edit</button>
    </div>
  </div>`;
}

/* ── Quick Add ── */
function todoQuickAdd() {
  const inp = document.getElementById("todo-quickadd-input");
  const title = inp?.value.trim();
  if (!title) {
    inp?.focus();
    return;
  }
  TODOS.push({
    id: todoNextId++,
    title,
    priority:
      document.getElementById("todo-quickadd-priority")?.value || "Medium",
    category: document.getElementById("todo-quickadd-cat")?.value || "Work",
    dueDate: "",
    dueTime: "",
    notes: "",
    completed: false,
    createdAt: new Date().toISOString(),
  });
  todoSave();
  if (inp) inp.value = "";
  renderTodos();
  showToast("✅ Task added!");
}

/* ── Toggle Done ── */
function toggleTodoDone(id) {
  const t = TODOS.find((x) => x.id === id);
  if (!t) return;
  t.completed = !t.completed;
  todoSave();
  renderTodos();
  if (t.completed) showToast("🎉 Task complete!");
}

/* ── Modal open/close ── */
function openTodoModal(id) {
  _todoEditId = id;
  const t = id != null ? TODOS.find((x) => x.id === id) : null;
  document.getElementById("todo-modal-heading").textContent = t
    ? "Edit Task"
    : "New Applicant";
  document.getElementById("td-title").value = t?.title || "";
  document.getElementById("td-priority").value = t?.priority || "Medium";
  document.getElementById("td-category").value = t?.category || "Work";
  document.getElementById("td-due").value = t?.dueDate || "";
  document.getElementById("td-time").value = t?.dueTime || "";
  document.getElementById("td-notes").value = t?.notes || "";
  // If task already has a GCal event, pre-check the sync toggle so re-saving will UPDATE (not duplicate)
  document.getElementById("td-gcal-sync").checked = !!t?.gcalEventId;
  // Reset and populate the status indicator
  const _gcalStatusEl = document.getElementById("td-gcal-status");
  if (_gcalStatusEl) {
    if (t?.gcalEventId) {
      _gcalStatusEl.className = "gs-info";
      _gcalStatusEl.innerHTML =
        "☁️ This applicant is synced — saving will update the existing GCal event.";
    } else {
      _gcalStatusEl.className = "";
      _gcalStatusEl.style.display = "none";
      _gcalStatusEl.innerHTML = "";
    }
  }
  document.getElementById("btn-todo-delete").style.display = t
    ? "inline-flex"
    : "none";
  document.getElementById("todo-modal-overlay").classList.add("open");
  setTimeout(() => document.getElementById("td-title")?.focus(), 80);
}
function closeTodoModal() {
  document.getElementById("todo-modal-overlay").classList.remove("open");
}
document
  .getElementById("todo-modal-overlay")
  .addEventListener("click", function (e) {
    if (e.target === this) closeTodoModal();
  });

/* ── Save ── */
async function saveTodo() {
  const title = document.getElementById("td-title").value.trim();
  if (!title) {
    showToast("❌ Task title is required.");
    return;
  }

  const sync = document.getElementById("td-gcal-sync")?.checked;
  const dueDate = document.getElementById("td-due").value;
  const statusEl = document.getElementById("td-gcal-status");

  // ── Guard: sync requested but no due date ──
  if (sync && !dueDate) {
    if (statusEl) {
      statusEl.className = "gs-warn";
      statusEl.innerHTML =
        "⚠️ A due date is required to sync to Google Calendar.";
    }
    document.getElementById("td-due").focus();
    return; // Don't save yet — let user fill in the date
  }

  const existing =
    _todoEditId != null ? TODOS.find((x) => x.id === _todoEditId) : null;
  const t = {
    id: _todoEditId != null ? _todoEditId : todoNextId++,
    title,
    priority: document.getElementById("td-priority").value,
    category: document.getElementById("td-category").value,
    dueDate,
    dueTime: document.getElementById("td-time").value,
    notes: document.getElementById("td-notes").value,
    completed: existing?.completed || false,
    createdAt: existing?.createdAt || new Date().toISOString(),
    gcalEventId: existing?.gcalEventId || null, // ← preserve existing GCal link
  };

  if (_todoEditId != null) {
    const i = TODOS.findIndex((x) => x.id === _todoEditId);
    if (i > -1) TODOS[i] = t;
    showToast("✅ Task updated!");
  } else {
    TODOS.push(t);
    showToast("✅ Task saved!");
  }
  todoSave();

  // ── Optional Google Calendar sync ──
  if (sync && dueDate) {
    if (!gcalSignedIn) {
      showToast("💡 Connect Google Calendar first to sync applicants.");
      closeTodoModal();
      renderTodos();
      return;
    }
    // Show spinner while syncing (modal stays open during the API call)
    if (statusEl) {
      statusEl.className = "gs-loading";
      statusEl.innerHTML =
        '<div class="gcal-spinner"></div> Syncing to Google Calendar…';
    }
    try {
      await _todoSyncToGcal(t);
      if (statusEl) {
        statusEl.className = "gs-ok";
        statusEl.innerHTML = "✅ Synced to Google Calendar successfully!";
      }
      // Brief pause so user sees the success state, then close
      await new Promise((r) => setTimeout(r, 700));
    } catch (err) {
      console.error("[GCal Todo Sync]", err);
      if (statusEl) {
        statusEl.className = "gs-err";
        statusEl.innerHTML =
          "⚠️ Google Calendar sync failed — applicant saved locally.";
      }
      showToast("⚠️ GCal sync failed. Task saved locally.");
      // Pause so the error is visible, then close
      await new Promise((r) => setTimeout(r, 1600));
    }
  }

  closeTodoModal();
  renderTodos();
}

/* ── Delete ── */
document
  .getElementById("btn-todo-delete")
  .addEventListener("click", async function () {
    if (_todoEditId == null) return;
    const t = TODOS.find((x) => x.id === _todoEditId);
    if (
      !(await uiConfirm("This todo will be permanently deleted.", {
        icon: "🗑️",
        title: `Delete "${t?.title}"?`,
        okText: "Delete",
        okDanger: true,
      }))
    )
      return;

    // ── Also delete the Google Calendar event if one was linked ──
    if (t?.gcalEventId && gcalSignedIn && gapi?.client?.calendar) {
      try {
        const calId = UPSTAFF_CALENDARS[0]?.calendarId || "primary";
        await gapi.client.calendar.events.delete({
          calendarId: calId,
          eventId: t.gcalEventId,
        });
        // Remove the matching local shadow event from the calendar view
        calEvents = calEvents.filter(
          (e) => e.google_event_id !== t.gcalEventId,
        );
        persistSave();
        showToast("🗑️ Task and Google Calendar event deleted.");
      } catch (e) {
        // 410 Gone means it was already deleted from Google's side — safe to ignore
        const code = e?.status || e?.result?.error?.code;
        if (code !== 410 && code !== 404) {
          console.warn("[GCal] Could not delete event:", e);
          showToast(
            "🗑️ Task deleted. GCal event could not be removed — delete it manually.",
          );
        } else {
          showToast("🗑️ Task deleted.");
        }
      }
    } else {
      showToast("🗑️ Task deleted.");
    }

    TODOS = TODOS.filter((x) => x.id !== _todoEditId);
    todoSave();
    closeTodoModal();
    renderTodos();
  });

/* ── Google Calendar sync for todos ──
   • INSERT  when t.gcalEventId is absent  → creates a new event
   • PATCH   when t.gcalEventId is present → updates the existing event (no duplicate)
   • Stores the returned event id back onto TODOS[i].gcalEventId + calls todoSave()
────────────────────────────────────────────── */
async function _todoSyncToGcal(t) {
  if (!gcalSignedIn || !gapi?.client?.calendar)
    throw new Error("GCal not initialised");

  const calId = UPSTAFF_CALENDARS[0]?.calendarId || "primary";

  const resource = {
    summary: `✅ ${t.title}`,
    description: [
      t.notes ? `Notes: ${t.notes}` : "",
      t.priority ? `Priority: ${t.priority}` : "",
      t.category ? `Category: ${t.category}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    start: t.dueTime
      ? { dateTime: `${t.dueDate}T${t.dueTime}:00`, timeZone: "Asia/Manila" }
      : { date: t.dueDate },
    end: t.dueTime
      ? { dateTime: `${t.dueDate}T${t.dueTime}:00`, timeZone: "Asia/Manila" }
      : { date: t.dueDate },
    colorId: "2", // green
  };

  let gcalId;

  if (t.gcalEventId) {
    // ── UPDATE existing event — avoids creating duplicates on re-save ──
    try {
      const resp = await gapi.client.calendar.events.patch({
        calendarId: calId,
        eventId: t.gcalEventId,
        resource,
      });
      gcalId = resp.result.id;
    } catch (patchErr) {
      // If the remote event was deleted, fall through and create a new one
      if (patchErr?.status === 404 || patchErr?.result?.error?.code === 404) {
        console.warn("[GCal] Event not found on server — creating a new one.");
        const resp = await gapi.client.calendar.events.insert({
          calendarId: calId,
          resource,
        });
        gcalId = resp.result.id;
        _injectLocalCalEvent(gcalId, calId, t);
      } else {
        throw patchErr;
      }
    }
    // Update the matching local cal event's metadata if it exists
    const lev = calEvents.find((e) => e.google_event_id === t.gcalEventId);
    if (lev) {
      lev.title = resource.summary;
      lev.name = t.title;
      lev.date = t.dueDate;
      lev.time = t.dueTime || "09:00";
      lev.notes = t.notes || "";
      persistSave();
    }
  } else {
    // ── CREATE new event ──
    const resp = await gapi.client.calendar.events.insert({
      calendarId: calId,
      resource,
    });
    gcalId = resp.result.id;
    _injectLocalCalEvent(gcalId, calId, t);
  }

  // ── Write gcalEventId back onto the TODOS array so it persists ──
  const idx = TODOS.findIndex((x) => x.id === t.id);
  if (idx > -1) {
    TODOS[idx].gcalEventId = gcalId;
    t.gcalEventId = gcalId; // also mutate the in-scope reference
  }
  todoSave();

  // Refresh calendar view if currently visible
  const calTab = document.querySelector('.view-tab[data-view="calendar"]');
  if (calTab?.classList.contains("active")) renderCalendar();
}

/* Helper: push a local calendar event so the Calendar view shows the task immediately */
function _injectLocalCalEvent(gcalId, calId, t) {
  calEvents.push({
    id: calNextId++,
    google_event_id: gcalId,
    calendarId: calId,
    isGoogleEvent: false,
    isTodoEvent: true,
    title: `✅ ${t.title}`,
    name: t.title,
    applicant_name: t.title,
    position: t.category || "To-Do",
    date: t.dueDate,
    time: t.dueTime || "09:00",
    start_time: t.dueTime || "09:00",
    end_time: t.dueTime || "09:30",
    type: "To-Do",
    round: "Task",
    interview_stage: "Task",
    status: "Scheduled",
    interviewer: "",
    notes: t.notes || "",
    meetingLink: "",
    meeting_link: "",
  });
  persistSave();
}

/* ══════════════════════════════════════════════
   LIST VIEW — Quick Add
══════════════════════════════════════════════ */
function listQuickAdd() {
  const inp = document.getElementById("list-quickadd-input");
  const name = inp?.value.trim();
  if (!name) {
    inp?.focus();
    return;
  }
  const t = {
    id: taskNextId++,
    name,
    status: document.getElementById("list-quickadd-status")?.value || "Applied",
    priority:
      document.getElementById("list-quickadd-priority")?.value || "Medium",
    position: JOB_POSITIONS[0],
    assignee: "HR Team",
    start: todayStr(),
    due: "",
    notes: "",
  };
  TASKS.push(t);
  persistSave();
  if (inp) inp.value = "";
  renderList();
  showToast("✅ Task added to list!");
}

/* ══════════════════════════════════════════════
   HR OPS — Edit Employee
══════════════════════════════════════════════ */
function openEmpEdit(empId) {
  const e = EMPLOYEES.find((x) => x.id === empId);
  if (!e) return;
  closeEmpDetailDirect();
  // Pre-fill hire modal
  const hfPos = document.getElementById("hf-position");
  if (hfPos)
    hfPos.innerHTML = JOB_POSITIONS.map(
      (p) => `<option value="${p}">${p}</option>`,
    ).join("");
  [
    ["hf-fname", e.fname],
    ["hf-lname", e.lname],
    ["hf-email", e.email || ""],
    ["hf-phone", e.phone || ""],
    ["hf-address", e.address || ""],
    ["hf-manager", e.manager || ""],
    ["hf-notes", e.notes || ""],
  ].forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
  const selects = [
    ["hf-position", e.position],
    ["hf-dept", e.dept],
    ["hf-emptype", e.emptype],
    ["hf-status", e.status],
  ];
  selects.forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  });
  document.getElementById("hf-start").value = e.start || "";
  // Change modal title
  const titleEl = document.querySelector(".hire-modal-title");
  if (titleEl) titleEl.textContent = `Edit: ${e.fname} ${e.lname}`;
  // Swap save button
  const subBtn = document.querySelector(
    ".hire-modal-body + div button.hr-btn.primary, #hire-modal button.hr-btn.primary",
  );
  document.getElementById("hire-modal-overlay").classList.add("open");
  // Store editing ID
  _empEditingId = empId;
}
let _empEditingId = null;

function saveEmpDetailChanges() {
  // If editing via modal is not open, just show toast
  const e = EMPLOYEES.find((x) => x.id === _empDetailId);
  if (e) {
    showToast('✅ Open "✏️ Edit Employee" to make changes.');
  }
}

/* saveNewHire patch removed — edit logic merged into original function above */

/* ══════════════════════════════════════════════
   BOARD VIEW — Drag & Drop Kanban
══════════════════════════════════════════════ */
function renderBoard() {
  autoProgressStatuses();
  const activeOrder = [...ACTIVE_STAGES, "Hired"];
  let html = "";
  activeOrder.forEach((st) => {
    const tasks = TASKS.filter((t) => t.status === st && !t.archived);
    const sm = STATUS_META[st] || STATUS_META["Applied"];
    const color = sm.color;
    const isTerminal = TERMINAL_STAGES.includes(st);
    html += `<div class="board-col"
      data-status="${st}"
      ondragover="event.preventDefault();this.querySelector('.board-col-body').classList.add('board-drop-active');"
      ondragleave="this.querySelector('.board-col-body').classList.remove('board-drop-active');"
      ondrop="boardDrop(event,'${st}')">
      <div class="board-col-header" style="border-top:3px solid ${color};">
        <div class="board-col-dot" style="background:${color};"></div>
        <span class="board-col-title">${st}</span>
        <span class="board-col-count">${tasks.length}</span>
      </div>
      <div class="board-col-body" id="board-col-${st.replace(/\s+/g, "-")}">
        ${tasks.length === 0 ? `<div style="text-align:center;padding:24px 12px;color:var(--muted);font-size:12px;opacity:0.6;">No applicants</div>` : ""}
        ${tasks
          .map((t) => {
            const pc = PRIORITY_COLORS[t.priority] || "#ccc";
            const dc = dueCls(t.due);
            const ac = avatarColor(t.assignee);
            const nextStg = getNextStage(t.status);
            const isActive = ACTIVE_STAGES.includes(t.status);
            const hasScores =
              t.typing_score || t.knowledge_score || t.verbal_link;
            const scoreTag = hasScores
              ? `<div class="board-card-scores">
            ${t.typing_score ? `<span class="score-chip">⌨️ ${t.typing_score}%</span>` : ""}
            ${t.knowledge_score ? `<span class="score-chip" style="${parseInt(t.knowledge_score) >= 75 ? "background:rgba(67,233,123,.12);color:var(--green);" : "background:rgba(239,68,68,.1);color:#ef4444;"}">📝 ${t.knowledge_score} ${parseInt(t.knowledge_score) >= 75 ? "✓" : "✗"}</span>` : ""}
            ${t.verbal_link ? `<span class="score-chip">🎙️ Verbal</span>` : ""}
          </div>`
              : "";
            return `<div class="board-card"
            draggable="true"
            data-task-id="${t.id}"
            ondragstart="boardDragStart(event,${t.id})"
            ondragend="boardDragEnd(event)"
            onclick="openTaskEdit(${t.id})">
            <div class="board-card-name">${sanitize(t.applicant_name || t.name)}</div>
            <div class="board-card-meta">
              <span class="board-card-pos">${sanitize(t.position)}</span>
              <span class="priority-pill" style="background:${pc}22;color:${pc};font-size:10px;">${t.priority}</span>
              <div class="assignee-avatar" style="background:${ac};margin-left:auto;" title="${sanitize(t.assignee)}">${initials(t.assignee)}</div>
            </div>
            ${t.due ? `<div style="margin-top:4px;"><span class="due-date ${dc}" style="font-size:10px;">📅 ${fmtDue(t.due)}</span></div>` : ""}
            ${scoreTag}
            <div class="board-mini-pipeline" title="${t.status}">
              ${STAGE_ORDER.map((_, i) => {
                const stIdx = STAGE_ORDER.indexOf(t.status);
                const bg =
                  t.status === "Rejected" || t.status === "Cancelled"
                    ? "#ef444466"
                    : i < stIdx
                      ? "#43e97b"
                      : i === stIdx
                        ? "#44d7e9"
                        : "rgba(0,0,0,0.1)";
                return `<div style="flex:1;height:3px;border-radius:99px;background:${bg};"></div>`;
              }).join("")}
            </div>
            ${
              isActive && nextStg
                ? `<div class="board-card-actions" onclick="event.stopPropagation();">
              <button class="bca-btn bca-next" onclick="advanceToNextStage(${t.id})" title="Move to ${nextStg}">→ ${nextStg}</button>
              ${t.status === "Review" ? `<button class="bca-btn bca-hire" onclick="hireApplicant(${t.id})">✓ Hire</button>` : ""}
              <button class="bca-btn bca-reject" onclick="rejectApplicant(${t.id})">✗</button>
            </div>`
                : ""
            }
            <div class="board-card-drag-hint">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/></svg>
            </div>
          </div>`;
          })
          .join("")}
      </div>
      ${
        !isTerminal
          ? `<button class="board-add-btn" onclick="openTaskNew('${st}')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add applicant
      </button>`
          : ""
      }
    </div>`;
  });

  const archived = TASKS.filter(
    (t) => t.archived || t.status === "Rejected" || t.status === "Cancelled",
  );
  if (archived.length) {
    html += `<div class="board-col board-col-archive">
      <div class="board-col-header" style="border-top:3px solid #9ca3af;">
        <div class="board-col-dot" style="background:#9ca3af;"></div>
        <span class="board-col-title">Archived</span>
        <span class="board-col-count">${archived.length}</span>
      </div>
      <div class="board-col-body" id="board-col-Archived">
        ${archived
          .map(
            (
              t,
            ) => `<div class="board-card board-card-archived" onclick="openTaskEdit(${t.id})">
          <div class="board-card-name" style="opacity:.55;text-decoration:line-through;">${sanitize(t.applicant_name || t.name)}</div>
          <div class="board-card-meta">
            <span class="board-card-pos">${sanitize(t.position)}</span>
            <span class="${statusPillClass(t.status)}" style="font-size:9px;">${t.status}</span>
          </div>
        </div>`,
          )
          .join("")}
      </div>
    </div>`;
  }

  document.getElementById("board-wrap").innerHTML = html;
}

function boardDragStart(event, taskId) {
  _dragTaskId = taskId;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(taskId));
  // Slight delay so the drag image shows the card, then add dragging style
  setTimeout(() => {
    const card = document.querySelector(
      `.board-card[data-task-id="${taskId}"]`,
    );
    if (card) card.style.opacity = "0.45";
  }, 0);
}
function boardDragEnd(event) {
  _dragTaskId = null;
  document
    .querySelectorAll(".board-card")
    .forEach((c) => (c.style.opacity = ""));
  document
    .querySelectorAll(".board-col-body")
    .forEach((b) => b.classList.remove("board-drop-active"));
}
function boardDrop(event, newStatus) {
  event.preventDefault();
  const colBody = event.currentTarget.querySelector(".board-col-body");
  if (colBody) colBody.classList.remove("board-drop-active");
  const taskId =
    _dragTaskId || parseInt(event.dataTransfer.getData("text/plain"));
  if (!taskId) return;
  const t = TASKS.find((x) => x.id === taskId);
  if (!t || t.status === newStatus) return;
  const oldStatus = t.status;
  t.status = newStatus;
  persistSave();
  renderBoard();
  showToast(`✅ Moved to ${newStatus}`);
  dbg(`[Board] Task "${t.name}" moved: ${oldStatus} → ${newStatus}`);
}

/* ══════════════════════════════════════════════
   MODAL HELPER UTILITIES
══════════════════════════════════════════════ */

/** Safe field setter — silently skips if element doesn't exist */
function _setField(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

/** Switch the applicant modal tab */
function _switchModalTab(tabName, btnEl) {
  document
    .querySelectorAll(".modal-tab")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelectorAll(".modal-tab-panel")
    .forEach((p) => p.classList.remove("active"));
  const panel = document.getElementById("tab-" + tabName);
  if (panel) panel.classList.add("active");
  const btn =
    btnEl || document.querySelector(`.modal-tab[data-tab="${tabName}"]`);
  if (btn) btn.classList.add("active");
  // Refresh score summary and portal banner when switching to assessment tab
  if (tabName === "assessment") {
    _refreshScoreSummary();
    const task = taskEditId ? TASKS.find((x) => x.id === taskEditId) : null;
    _updateImportBanner(task);
  }
}

/** Show/hide assessment sections based on position's required tests */
function _updateAssessmentPanel(position) {
  const tests = getAssessmentConfig(position);
  const map = {
    typing: "assess-typing",
    knowledge: "assess-knowledge",
    verbal: "assess-verbal",
    interview: "assess-interview-notes",
  };
  Object.entries(map).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = tests.includes(key) ? "block" : "none";
  });
  const note = document.getElementById("assessment-config-note");
  if (note) {
    const labels = {
      typing: "Typing Test",
      knowledge: "Knowledge Test",
      verbal: "Verbal Recording",
      interview: "Interview Notes",
    };
    const required = tests.map((k) => labels[k] || k).join(" · ");
    note.textContent = `Required for ${position || "this role"}: ${required}`;
    note.style.display = "block";
  }
  // Update verbal link preview
  const verbalInput = document.getElementById("f-verbal-link");
  if (verbalInput) _updateVerbalPreview(verbalInput.value);
}

function _updateVerbalPreview(url) {
  const preview = document.getElementById("verbal-link-preview");
  const link = document.getElementById("verbal-link-open");
  if (!preview || !link) return;
  if (url && url.startsWith("http")) {
    link.href = url;
    preview.style.display = "block";
  } else {
    preview.style.display = "none";
  }
}

/** Show/hide pipeline action strip and update button labels */
function _updatePipelineActions(taskId, status) {
  window._editingTaskId = taskId;
  const strip = document.getElementById("task-pipeline-actions");
  const btnNext = document.getElementById("btn-advance-stage");
  const btnHire = document.getElementById("btn-hire-now");
  const btnRej = document.getElementById("btn-reject-now");
  if (!strip) return;

  // Hide Assessment tab for early stages where it hasn't happened yet
  const assessTab = document.querySelector('.modal-tab[data-tab="assessment"]');
  const HIDE_ASSESS_STAGES = ["Applied", "Screening", "Interview"];
  if (assessTab) {
    assessTab.style.display = HIDE_ASSESS_STAGES.includes(status) ? "none" : "";
    // If currently on assessment tab and it should be hidden, switch back to profile
    if (
      HIDE_ASSESS_STAGES.includes(status) &&
      assessTab.classList.contains("active")
    ) {
      _switchModalTab("profile");
    }
  }

  // Show/hide Review tab based on current stage
  _updateReviewTab(status);

  if (!taskId || TERMINAL_STAGES.includes(status)) {
    strip.style.display = "none";
    return;
  }

  const next = getNextStage(status);
  strip.style.display = "flex";
  if (btnNext) {
    btnNext.textContent = next ? `→ ${next}` : "✓ Final Stage";
    btnNext.style.display = next ? "inline-flex" : "none";
  }
  if (btnHire)
    btnHire.style.display = status === "Review" ? "inline-flex" : "none";
  if (btnRej) btnRej.style.display = "inline-flex";
}

/** Refresh the score summary card in the assessment tab */
function _refreshScoreSummary() {
  const card = document.getElementById("score-summary");
  if (!card) return;
  const typing = document.getElementById("f-typing-score")?.value;
  const knowledge = document.getElementById("f-knowledge-score")?.value;
  const verbal = document.getElementById("f-verbal-link")?.value;
  const notes = document.getElementById("f-interview-notes")?.value;
  const hasAny = typing || knowledge || verbal || notes;
  if (!hasAny) {
    card.style.display = "none";
    return;
  }
  card.style.display = "block";
  card.innerHTML = `
    <div class="score-summary-title">📊 Score Summary</div>
    <div class="score-summary-grid">
      ${typing ? `<div class="score-item"><span class="score-label">⌨️ Typing</span><span class="score-val">${typing}%</span></div>` : ""}
      ${(() => {
        if (!knowledge) return "";
        const kNum = parseInt(knowledge) || 0;
        const passed = kNum >= 75;
        const resultColor = passed ? "var(--green)" : "#ef4444";
        const resultBg = passed ? "rgba(67,233,123,.12)" : "rgba(239,68,68,.1)";
        return `<div class="score-item" style="flex-direction:column;align-items:flex-start;gap:4px;grid-column:1/-1;">
          <span class="score-label">📝 Knowledge Test</span>
          <div style="display:flex;align-items:center;gap:8px;width:100%;">
            <span class="score-val">${knowledge}/100</span>
            <span style="font-size:11px;font-weight:800;font-family:'Montserrat',sans-serif;padding:2px 10px;border-radius:99px;background:${resultBg};color:${resultColor};">${passed ? "✓ PASSED" : "✗ FAILED"}</span>
            <span style="font-size:10px;color:var(--muted);font-family:'DM Sans',sans-serif;margin-left:auto;">Threshold: 75/100</span>
          </div>
        </div>`;
      })()}
      ${verbal ? `<div class="score-item"><span class="score-label">🎙️ Verbal</span><a href="${verbal}" target="_blank" class="score-val" style="color:var(--cyan);">View</a></div>` : ""}
      ${notes ? `<div class="score-item score-item-full"><span class="score-label">💬 Notes</span><span class="score-val" style="font-weight:400;color:var(--muted);">${notes.slice(0, 80)}${notes.length > 80 ? "…" : ""}</span></div>` : ""}
    </div>`;
  // Visual feedback on filled score inputs
  ["f-typing-score", "f-knowledge-score"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("score-filled", !!el.value.trim());
  });
}

/* ══════════════════════════════════════════════
   ASSESSMENT PORTAL INTEGRATION
   ──────────────────────────────────────────────
   Bridge between pm-ui and the external assessment
   portal (voicetest.html) developed by the friend.

   ┌─────────────────────────────────────────────┐
   │  WHAT THE PORTAL (voicetest.html) MUST DO   │
   │                                             │
   │  At the end of the assessment, call this:   │
   │                                             │
   │  window.submitAssessmentResult({            │
   │    email:          "user@email.com",         │
   │    name:           "Maria Santos",           │
   │    typing_score:   "75",    // WPM string   │
   │    knowledge_score:"82",    // 0-100 string  │
   │    verbal_link:    "https://drive.google.com/...", │
   │    interview_notes:""       // optional      │
   │  });                                        │
   │                                             │
   │  OR write directly to localStorage:         │
   │                                             │
   │  (function(){                               │
   │    const KEY = 'upstaff_pending_assessments';│
   │    const existing = JSON.parse(             │
   │      localStorage.getItem(KEY) || '[]'      │
   │    );                                       │
   │    existing.push({                          │
   │      email:          "user@email.com",       │
   │      name:           "Maria Santos",         │
   │      typing_score:   "75",                  │
   │      knowledge_score:"82",                  │
   │      verbal_link:    "https://...",          │
   │      interview_notes:"",                    │
   │      submitted_at:   new Date().toISOString(),│
   │      imported:       false                  │
   │    });                                      │
   │    localStorage.setItem(KEY,                │
   │      JSON.stringify(existing));             │
   │  })();                                      │
   └─────────────────────────────────────────────┘

   Protocol (localStorage):
   ─────────────────────────────────────────────
   The portal writes results to:
     localStorage.key  → "upstaff_pending_assessments"
     localStorage.value → JSON array of result objects:
     [{
       email:          "applicant@email.com",   // used to match
       name:           "Maria Santos",           // fallback match
       typing_score:   "75",                     // WPM / score string
       knowledge_score:"82",                     // 0-100 string
       verbal_link:    "https://drive.../file",  // recording URL
       interview_notes:"...",                    // free text
       submitted_at:   "2026-03-15T09:30:00",   // ISO timestamp
       imported:       false                     // set to true once applied
     }]

   pm-ui reads this key, matches by email (or name
   fallback), shows an import banner in the modal,
   and marks results as `imported:true` once applied.
══════════════════════════════════════════════ */
const ASSESSMENT_PORTAL_LS_KEY = "upstaff_pending_assessments";
const ASSESSMENT_PORTAL_URL = "voicetest.html"; // path to friend's portal

/**
 * Global function the friend's portal can call directly:
 *   window.submitAssessmentResult({ email, name, typing_score, ... })
 * Works whether the portal is in the same tab or a same-origin iframe.
 */
window.submitAssessmentResult = function (result) {
  try {
    if (!result || (!result.email && !result.name)) {
      console.warn(
        "[Assessment] submitAssessmentResult: missing email/name, result ignored.",
      );
      return;
    }
    let existing = [];
    try {
      existing = JSON.parse(
        localStorage.getItem(ASSESSMENT_PORTAL_LS_KEY) || "[]",
      );
    } catch (e) {
      console.error("[Assessment] ❌ Corrupted assessment data:", e);
    }
    // Avoid duplicate submissions from same person
    const dupIdx = existing.findIndex(
      (r) =>
        (result.email &&
          r.email &&
          r.email.toLowerCase() === result.email.toLowerCase()) ||
        (result.name &&
          r.name &&
          r.name.toLowerCase() === result.name.toLowerCase()),
    );
    const entry = {
      ...result,
      submitted_at: result.submitted_at || new Date().toISOString(),
      imported: false,
    };
    if (dupIdx >= 0)
      existing[dupIdx] = entry; // overwrite with latest
    else existing.push(entry);
    localStorage.setItem(ASSESSMENT_PORTAL_LS_KEY, JSON.stringify(existing));
    dbg(`[Assessment] ✅ Result stored for "${result.name || result.email}"`);
    // Notify pm-ui if it's already open (same tab / same-origin)
    window.dispatchEvent(
      new CustomEvent("upstaff:assessmentSubmitted", { detail: entry }),
    );
  } catch (e) {
    console.error("[Assessment] submitAssessmentResult error:", e);
  }
};

/** Load all pending (not-yet-imported) results from localStorage */
function _loadPendingAssessments() {
  try {
    const raw = localStorage.getItem(ASSESSMENT_PORTAL_LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw).filter((r) => !r.imported);
  } catch (e) {
    return [];
  }
}

/** Save the full (mutated) pending list back to localStorage */
function _savePendingAssessments(list) {
  try {
    localStorage.setItem(ASSESSMENT_PORTAL_LS_KEY, JSON.stringify(list));
  } catch (e) {
    dbg("[_savePendingAssessments] localStorage write failed:", e);
  }
}

/**
 * Find a pending result that matches the given task.
 * Matches by email first, then by name (case-insensitive).
 */
function _matchPendingResult(task) {
  const pending = _loadPendingAssessments();
  if (!pending.length) return null;
  const email = (task.applicant_email || "").toLowerCase().trim();
  const name = (task.applicant_name || task.name || "").toLowerCase().trim();
  return (
    pending.find((r) => {
      if (email && r.email && r.email.toLowerCase().trim() === email)
        return true;
      if (name && r.name && r.name.toLowerCase().trim() === name) return true;
      return false;
    }) || null
  );
}

/** Total count of unimported results across ALL tasks */
function _countAllPending() {
  return _loadPendingAssessments().length;
}

/**
 * Update the badge on the Assessment tab button.
 * Called whenever we open the modal or detect new results.
 */
function _updateAssessTabBadge(task) {
  const badge = document.getElementById("assess-tab-badge");
  if (!badge) return;
  const match = task ? _matchPendingResult(task) : null;
  if (match) {
    badge.textContent = "1";
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
}

/**
 * Show or hide the import banner inside the Assessment tab.
 * Called when the tab is opened or when checking for results.
 */
function _updateImportBanner(task) {
  const banner = document.getElementById("assess-import-banner");
  const title = document.getElementById("assess-import-banner-title");
  const sub = document.getElementById("assess-import-banner-sub");
  if (!banner) return;

  const result = task ? _matchPendingResult(task) : null;
  if (!result) {
    banner.classList.remove("visible");
    return;
  }

  banner.classList.add("visible");
  const parts = [];
  if (result.typing_score) parts.push(`Typing: ${result.typing_score}%`);
  if (result.knowledge_score)
    parts.push(`Knowledge: ${result.knowledge_score}/100`);
  if (result.verbal_link) parts.push("Verbal: ✓ Recording");
  if (title)
    title.textContent = `New scores from ${result.name || result.email || "applicant"}`;
  if (sub)
    sub.textContent = parts.length
      ? `Submitted ${result.submitted_at ? new Date(result.submitted_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "recently"} — ${parts.join(" · ")}`
      : "Assessment completed via portal. Click Apply to fill in the scores.";
}

/**
 * "Check Results" button handler.
 * Re-reads localStorage and updates the banner + status line.
 */
function fetchAssessmentFromPortal() {
  const statusEl = document.getElementById("assess-fetch-status");
  const task = taskEditId ? TASKS.find((x) => x.id === taskEditId) : null;

  // Re-read fresh
  const result = task ? _matchPendingResult(task) : null;
  _updateImportBanner(task);
  _updateAssessTabBadge(task);

  if (!statusEl) return;
  statusEl.className = "assess-fetch-status";

  if (result) {
    statusEl.className = "assess-fetch-status ok";
    statusEl.textContent =
      '✅ Matched result found — click "Apply Scores" to import.';
  } else if (_countAllPending() > 0) {
    statusEl.className = "assess-fetch-status info";
    statusEl.textContent = `ℹ️ ${_countAllPending()} result(s) pending in portal — no match for this applicant yet.`;
  } else {
    statusEl.className = "assess-fetch-status info";
    statusEl.textContent =
      "ℹ️ No pending results found. Send the applicant the portal link.";
  }
  setTimeout(() => {
    statusEl.className = "assess-fetch-status";
  }, 5000);
}

/**
 * "Apply Scores" button handler.
 * Fills the modal form fields with the matched result and marks it imported.
 */
function applyPendingAssessment() {
  const task = taskEditId ? TASKS.find((x) => x.id === taskEditId) : null;
  if (!task) return;

  try {
    const raw = localStorage.getItem(ASSESSMENT_PORTAL_LS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const email = (task.applicant_email || "").toLowerCase().trim();
    const name = (task.applicant_name || task.name || "").toLowerCase().trim();

    const idx = list.findIndex(
      (r) =>
        (email && r.email && r.email.toLowerCase().trim() === email) ||
        (name && r.name && r.name.toLowerCase().trim() === name),
    );
    if (idx === -1) {
      showToast("⚠️ No matching result found.");
      return;
    }

    const r = list[idx];

    // Fill modal fields
    const _fill = (id, val) => {
      const el = document.getElementById(id);
      if (el && val) {
        el.value = val;
        el.classList.add("score-filled");
      }
    };
    _fill("f-typing-score", r.typing_score || "");
    _fill("f-knowledge-score", r.knowledge_score || "");
    _fill("f-verbal-link", r.verbal_link || "");
    if (r.interview_notes) {
      const notesEl = document.getElementById("f-interview-notes");
      if (notesEl)
        notesEl.value =
          (notesEl.value ? notesEl.value + "\n\n" : "") + r.interview_notes;
    }

    // Mark as imported
    list[idx].imported = true;
    _savePendingAssessments(list);

    // Refresh UI
    _updateImportBanner(task);
    _updateAssessTabBadge(task);
    _refreshScoreSummary();

    const statusEl = document.getElementById("assess-fetch-status");
    if (statusEl) {
      statusEl.className = "assess-fetch-status ok";
      statusEl.textContent =
        "✅ Scores applied! Save the applicant to persist changes.";
      setTimeout(() => {
        statusEl.className = "assess-fetch-status";
      }, 6000);
    }
    showToast(`✅ Assessment scores applied for ${task.name}`);
  } catch (e) {
    console.error("[Assessment] applyPendingAssessment error:", e);
    showToast("⚠️ Could not apply scores. Check console for details.");
  }
}

/**
 * Background poller — checks for new portal results every 30 seconds
 * and shows a toast notification if new unread results arrive.
 * Also listens for the instant CustomEvent from window.submitAssessmentResult.
 */
(function startAssessmentPoller() {
  let lastCount = _countAllPending();

  function _checkForNew() {
    const current = _countAllPending();
    if (current > lastCount) {
      const diff = current - lastCount;
      showToast(
        `📋 ${diff} new assessment result${diff > 1 ? "s" : ""} received from portal!`,
      );
      // If the modal is open on the assessment tab, refresh the banner
      const overlay = document.getElementById("task-modal-overlay");
      if (overlay?.classList.contains("open") && taskEditId) {
        const task = TASKS.find((x) => x.id === taskEditId);
        _updateImportBanner(task);
        _updateAssessTabBadge(task);
      }
    }
    lastCount = current;
  }

  // Instant notification via CustomEvent (same-origin portal)
  window.addEventListener("upstaff:assessmentSubmitted", _checkForNew);

  // Fallback poller every 30s (covers cross-tab writes)
  setInterval(_checkForNew, 30000);
})();

/* ══════════════════════════════════════════════
   EMAILJS — ASSESSMENT INVITATION SYSTEM
══════════════════════════════════════════════ */

/* ── Load / Save EmailJS config from localStorage ── */
const EMAILJS_DEFAULTS = {
  serviceId: "service_u2ndjyi",
  templateId: "template_jqjzkgs",
  publicKey: "uf6F8j1q2Hki-DR9s",
  portalUrl: "https://kingnoob3605.github.io/upstaff-portal/",
  expiryHours: 72,
};
function loadEmailJSConfig() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem("upstaff_emailjs_config") || "{}");
  } catch (e) {
    console.error("[EmailJS] ❌ Corrupted config, using defaults:", e);
  }
  return Object.assign({}, EMAILJS_DEFAULTS, saved);
}
function saveEmailJSConfig() {
  const config = {
    serviceId: document.getElementById("s-emailjs-service")?.value.trim() || "",
    templateId:
      document.getElementById("s-emailjs-template")?.value.trim() || "",
    publicKey: document.getElementById("s-emailjs-pubkey")?.value.trim() || "",
    portalUrl:
      document.getElementById("s-assess-portal-url")?.value.trim() || "",
    expiryHours: parseInt(
      document.getElementById("s-assess-expiry")?.value || "72",
    ),
  };
  localStorage.setItem("upstaff_emailjs_config", JSON.stringify(config));
  showToast("✅ EmailJS settings saved.");
}
function populateEmailJSSettings() {
  const c = loadEmailJSConfig();
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };
  set("s-emailjs-service", c.serviceId);
  set("s-emailjs-template", c.templateId);
  set("s-emailjs-pubkey", c.publicKey);
  set("s-assess-portal-url", c.portalUrl);
  const expEl = document.getElementById("s-assess-expiry");
  if (expEl && c.expiryHours) expEl.value = String(c.expiryHours);
}

/* ── Generate a unique token for this assessment invite ── */
function generateAssessToken() {
  return (
    "ast_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  );
}

/* ── Build the assessment URL with token + email ── */
function buildAssessmentLink(task, token) {
  const config = loadEmailJSConfig();
  const base = config.portalUrl || "https://yoursite.com/assessment";
  const email = encodeURIComponent(task.applicant_email || "");
  const name = encodeURIComponent(task.applicant_name || task.name || "");
  return `${base}?token=${token}&email=${email}&name=${name}`;
}

/* ── Update the invite status UI inside the Assessment tab ── */
function _refreshAssessInviteUI(task) {
  const badge = document.getElementById("assess-status-badge");
  const meta = document.getElementById("assess-status-meta");
  const sendBtn = document.getElementById("assess-send-btn");
  const resendBtn = document.getElementById("assess-resend-btn");
  const resetBtn = document.getElementById("assess-reset-btn");
  const noteEl = document.getElementById("assess-invite-note");
  if (!badge) return;

  const config = loadEmailJSConfig();
  const expHrs = config.expiryHours || 72;

  if (task.assess_completed) {
    badge.className = "assess-status-badge completed";
    badge.textContent = "✔ Completed";
    meta.textContent = task.assess_completed_at
      ? "Completed on " +
        new Date(task.assess_completed_at).toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";
    sendBtn.style.display = "none";
    resendBtn.style.display = "none";
    resetBtn.style.display = "inline-flex";
    noteEl.textContent =
      "Applicant has completed the assessment. Reset to allow a retry.";
    return;
  }

  if (task.assess_sent_at) {
    const sentDate = new Date(task.assess_sent_at);
    const expiresAt = new Date(sentDate.getTime() + expHrs * 3600000);
    const now = new Date();
    const expired = now > expiresAt;
    badge.className = expired
      ? "assess-status-badge expired"
      : "assess-status-badge sent";
    badge.textContent = expired ? "✗ Link Expired" : "● Sent";
    meta.textContent =
      "Sent " +
      sentDate.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    sendBtn.style.display = "none";
    resendBtn.style.display = "inline-flex";
    resetBtn.style.display = "inline-flex";
    noteEl.textContent = expired
      ? `Link expired after ${expHrs}h. Click Resend to generate a new one.`
      : `Link expires ${expiresAt.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} at ${expiresAt.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}.`;
    return;
  }

  // Not sent yet
  badge.className = "assess-status-badge not-sent";
  badge.textContent = "● Not Sent";
  meta.textContent = "";
  sendBtn.style.display = "inline-flex";
  resendBtn.style.display = "none";
  resetBtn.style.display = "none";
  noteEl.textContent = "Send an assessment invitation email to the applicant.";
}

/* ── Core send function (used by both Send and Resend) ── */
async function _doSendAssessmentEmail(isResend = false) {
  const taskId = window._editingTaskId;
  if (!taskId) return;
  const task = TASKS.find((t) => t.id === taskId);
  if (!task) return;

  if (!task.applicant_email) {
    showToast("⚠️ No email address on file for this applicant.");
    return;
  }

  const config = loadEmailJSConfig();
  if (!config.serviceId || !config.templateId || !config.publicKey) {
    showToast(
      "⚠️ EmailJS not configured. Go to Settings → EmailJS Integration.",
    );
    return;
  }

  const noteEl = document.getElementById("assess-invite-note");
  if (noteEl) noteEl.textContent = isResend ? "Resending…" : "Sending…";

  // Generate new token
  const token = generateAssessToken();
  const link = buildAssessmentLink(task, token);

  // Initialize EmailJS
  emailjs.init(config.publicKey);

  const templateParams = {
    to_email: task.applicant_email,
    first_name: (task.applicant_name || task.name || "Applicant").split(" ")[0],
    company_name: "Upstaff",
    company_email: "hr@upstaff.com",
    website_link: link,
  };

  try {
    await emailjs.send(config.serviceId, config.templateId, templateParams, {
      publicKey: config.publicKey,
    });
    // Save token + timestamp to task record
    task.assess_token = token;
    task.assess_sent_at = new Date().toISOString();
    task.assess_completed = false;
    task.assess_completed_at = null;
    persistSave();
    _refreshAssessInviteUI(task);
    showToast(
      isResend
        ? "✅ Assessment link resent!"
        : "✅ Assessment invitation sent!",
    );
  } catch (err) {
    console.error("EmailJS error:", err);
    if (noteEl)
      noteEl.textContent = "❌ Failed to send. Check EmailJS settings.";
    showToast("❌ Email failed. Check EmailJS config in Settings.");
  }
}

function sendAssessmentEmail() {
  _doSendAssessmentEmail(false);
}
function resendAssessmentEmail() {
  _doSendAssessmentEmail(true);
}

/* ── Reset attempt — allows applicant to retake ── */
async function resetAssessmentAttempt() {
  const taskId = window._editingTaskId;
  if (!taskId) return;
  const task = TASKS.find((t) => t.id === taskId);
  if (!task) return;
  if (
    !(await uiConfirm("They will be able to retake the assessment.", {
      icon: "🔄",
      title: "Reset Assessment?",
      okText: "Reset",
    }))
  )
    return;
  task.assess_completed = false;
  task.assess_completed_at = null;
  task.assess_token = null;
  task.assess_sent_at = null;
  persistSave();
  _refreshAssessInviteUI(task);
  showToast("🔄 Assessment attempt reset.");
}

/* ══════════════════════════════════════════════
   TASK MODAL
══════════════════════════════════════════════ */
function openTaskNew(status = "Applied") {
  taskEditId = null;
  document.getElementById("task-modal-heading").textContent = "New Applicant";
  document.getElementById("f-name").value = "";
  document.getElementById("f-status").value = status;
  document.getElementById("f-priority").value = "Medium";
  document.getElementById("f-position").value = "Intake Caller";
  document.getElementById("f-assignee").value = "HR Team";
  document.getElementById("f-start").value = new Date()
    .toISOString()
    .slice(0, 10);
  document.getElementById("f-due").value = "";
  document.getElementById("f-notes").value = "";
  document.getElementById("f-folder").value = "";
  // Applicant profile fields
  _setField("f-email", "");
  _setField("f-phone", "");
  _setField("f-resume", "");
  _setField("f-portfolio", "");
  _setField("f-app-date", new Date().toISOString().slice(0, 10));
  // Assessment fields
  _setField("f-typing-score", "");
  _setField("f-knowledge-score", "");
  _setField("f-verbal-link", "");
  _setField("f-interview-notes", "");
  // Stage progress bar
  document.getElementById("task-stage-progress").innerHTML =
    buildStageProgress(status);
  // Update assessment tabs visibility
  _updateAssessmentPanel("Intake Caller");
  // Pipeline action buttons
  _updatePipelineActions(null, status);
  // GCal sync toggle
  const syncEl = document.getElementById("f-task-gcal-sync");
  if (syncEl) syncEl.checked = false;
  const statusEl = document.getElementById("f-task-gcal-status");
  if (statusEl) {
    statusEl.style.display = "none";
    statusEl.textContent = "";
  }
  document.getElementById("btn-task-delete").style.display = "none";
  // Switch to Profile tab
  _switchModalTab("profile");
  document.getElementById("task-modal-overlay").classList.add("open");
}
function openTaskEdit(id, goToAssessment = false) {
  const t = TASKS.find((x) => x.id === id);
  if (!t) return;
  taskEditId = id;
  document.getElementById("task-modal-heading").textContent =
    t.applicant_name || t.name;
  document.getElementById("f-name").value = t.applicant_name || t.name;
  document.getElementById("f-status").value = t.status;
  document.getElementById("f-priority").value = t.priority;
  document.getElementById("f-position").value = t.position;
  document.getElementById("f-assignee").value = t.assignee;
  document.getElementById("f-start").value = t.start || "";
  document.getElementById("f-due").value = t.due || "";
  document.getElementById("f-notes").value = t.notes || "";
  document.getElementById("f-folder").value = t.candidateFolder || "";
  // Applicant profile fields
  _setField("f-email", t.applicant_email || "");
  _setField("f-phone", t.applicant_phone || "");
  _setField("f-resume", t.resume_link || "");
  _setField("f-portfolio", t.portfolio_link || "");
  _setField("f-app-date", t.application_date || t.start || "");
  // Assessment fields
  _setField("f-typing-score", t.typing_score || "");
  _setField("f-knowledge-score", t.knowledge_score || "");
  _setField("f-verbal-link", t.verbal_link || "");
  _setField("f-interview-notes", t.interview_notes || "");
  // Stage progress bar
  document.getElementById("task-stage-progress").innerHTML = buildStageProgress(
    t.status,
  );
  // Assessment panel visibility based on position
  _updateAssessmentPanel(t.position);
  // Refresh assessment invite card status
  _refreshAssessInviteUI(t);
  // Review tab: show only for Review stage, populate sections
  _updateReviewTab(t.status);
  if (t.status === "Review") _populateReviewTab(t);
  // Interview Schedule tab: show only for Interview stage
  _updateInterviewScheduleTab(t.status);
  if (t.status === "Interview") _populateInterviewScheduleTab(t);
  // Pipeline action buttons
  _updatePipelineActions(id, t.status);
  // GCal sync toggle — pre-check if already synced so re-save updates rather than duplicates
  const syncEl = document.getElementById("f-task-gcal-sync");
  if (syncEl) syncEl.checked = !!t.gcalEventId;
  const statusEl = document.getElementById("f-task-gcal-status");
  if (statusEl) {
    if (t.gcalEventId) {
      statusEl.style.display = "block";
      statusEl.textContent =
        "☁️ Synced to Google Calendar — saving will update the existing event.";
      statusEl.style.color = "var(--cyan)";
    } else {
      statusEl.style.display = "none";
      statusEl.textContent = "";
    }
  }
  document.getElementById("btn-task-delete").style.display = "inline-flex";
  // Switch tab — go to Assessment tab if requested (e.g. "View Scores" action)
  _switchModalTab(goToAssessment ? "assessment" : "profile");
  document.getElementById("task-modal-overlay").classList.add("open");
  // Check for pending portal results for this applicant
  _updateAssessTabBadge(t);
  _updateImportBanner(t);
  // Set portal link with applicant email pre-filled as a URL param
  const portalBtn = document.getElementById("assess-portal-open-btn");
  if (portalBtn) {
    const emailParam = t.applicant_email
      ? `?email=${encodeURIComponent(t.applicant_email)}&name=${encodeURIComponent(t.applicant_name || t.name || "")}`
      : "";
    portalBtn.href = ASSESSMENT_PORTAL_URL + emailParam;
  }
}
/* ══════════════════════════════════════════════
   REVIEW TAB
══════════════════════════════════════════════ */

/** Show Review tab only when stage is Review */
function _updateReviewTab(status) {
  const btn = document.getElementById("tab-btn-review");
  if (!btn) return;
  const isReview = status === "Review";
  btn.style.display = isReview ? "" : "none";
  if (!isReview && btn.classList.contains("active")) {
    _switchModalTab("profile");
  }
}

/* ══════════════════════════════════════════════
   INTERVIEW SCHEDULE TAB
══════════════════════════════════════════════ */

/** Show the Interview tab only when stage is Interview */
function _updateInterviewScheduleTab(status) {
  const btn = document.getElementById("tab-btn-interview-schedule");
  if (!btn) return;
  const isInterview = status === "Interview";
  btn.style.display = isInterview ? "" : "none";
  if (!isInterview && btn.classList.contains("active")) {
    _switchModalTab("profile");
  }
}

/** Populate Interview tab defaults and render saved list */
function _populateInterviewScheduleTab(task) {
  if (!task) return;

  // Auto-fill date → today
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const dateEl = document.getElementById("iv-date");
  if (dateEl && !dateEl.value) dateEl.value = todayStr;

  // Auto-fill times → 9:00 – 10:00
  const startEl = document.getElementById("iv-start-time");
  if (startEl && !startEl.value) startEl.value = "09:00";
  const endEl = document.getElementById("iv-end-time");
  if (endEl && !endEl.value) endEl.value = "10:00";

  // Auto-fill interviewer from task assignee
  const interviewerEl = document.getElementById("iv-interviewer");
  if (interviewerEl && !interviewerEl.value) {
    interviewerEl.value = task.assignee || "HR Team";
  }

  // Auto-select interview stage based on task status
  const typeEl = document.getElementById("iv-type");
  if (typeEl && task.status) {
    const stageMap = {
      Interview: "Initial Interview",
      Screening: "HR Round",
      Assessment: "Knowledge Assessment",
      Review: "Final Interview",
    };
    if (stageMap[task.status]) typeEl.value = stageMap[task.status];
  }

  // Reset IV platform UI to Google Meet
  _ivPlatform = "meet";
  const meetBtn = document.querySelector("[data-ivplatform='meet']");
  if (meetBtn) setIvPlatform("meet", meetBtn);

  // Reset link preview
  const ivPreview = document.getElementById("iv-link-preview");
  if (ivPreview) ivPreview.style.display = "none";

  // Render the saved interviews list for this applicant
  _renderIvSavedList(task);
}

/** Render the list of saved interviews for this applicant */
function _renderIvSavedList(task) {
  const el = document.getElementById("iv-saved-list");
  if (!el) return;

  const name = (task.applicant_name || task.name || "").toLowerCase();

  // Match events linked to this task by taskId OR by name
  const matched = calEvents
    .filter(
      (e) =>
        e.taskId === task.id ||
        (e.applicant_name || e.name || "").toLowerCase().includes(name),
    )
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  if (!matched.length) {
    el.innerHTML = `<div style="font-size:12px;color:var(--light);padding:8px 0;">No interviews scheduled yet. Use the form above to add one.</div>`;
    return;
  }

  // Status color map
  const statusColors = {
    Scheduled: "#3b82f6",
    Completed: "#22c55e",
    Rescheduled: "#f59e0b",
    Cancelled: "#ef4444",
  };

  el.innerHTML = matched
    .map((e) => {
      const sc = statusColors[e.status] || "var(--muted)";
      const ml = e.meeting_link || e.meetingLink || "";
      const end = e.end_time || e.endTime || "";
      const startFmt = fmtTime(e.time || e.start_time || "");
      const endFmt = end ? " – " + fmtTime(end) : "";

      return `
      <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="font-size:13px;font-weight:700;color:var(--text);">
            ${e.round || e.interview_type || "Interview"}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11px;font-weight:700;color:${sc};background:${sc}18;padding:2px 10px;border-radius:20px;">
              ${e.status || "Scheduled"}
            </span>
            <button
              onclick="deleteIvScheduleEvent(${e.id})"
              style="background:none;border:none;cursor:pointer;color:var(--light);font-size:13px;padding:0;line-height:1;"
              title="Remove">✕</button>
          </div>
        </div>
        <div style="font-size:12px;color:var(--muted);display:flex;flex-wrap:wrap;gap:10px;">
          <span>📅 ${e.date || "—"}</span>
          <span>⏰ ${startFmt}${endFmt}</span>
          ${e.interviewer ? `<span>👤 ${e.interviewer}</span>` : ""}
          ${ml ? `<a href="${ml}" target="_blank" style="color:var(--cyan);font-weight:700;">🔗 Join</a>` : ""}
        </div>
        ${e.notes ? `<div style="font-size:11px;color:var(--light);margin-top:6px;padding-top:6px;border-top:1px solid var(--border);">${e.notes}</div>` : ""}
      </div>
    `;
    })
    .join("");
}

/* ── IV tab platform state ── */
let _ivPlatform = "meet";

function ivAutoEndTime(start) {
  if (!start) return "";
  const [h, m] = start.split(":").map(Number);
  const end = new Date(2000, 0, 1, h, m + 60);
  return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
}

function setIvPlatform(platform, btnEl) {
  _ivPlatform = platform;
  document
    .querySelectorAll("[data-ivplatform]")
    .forEach((b) => b.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");
  const genBtn = document.getElementById("iv-btn-gen-link");
  const openBtn = document.getElementById("iv-btn-open-link");
  const input = document.getElementById("iv-meeting-link");
  const noteEl = document.getElementById("iv-link-note");
  if (!genBtn) return;
  if (platform === "custom") {
    genBtn.style.display = "none";
    openBtn.style.display = "none";
    if (input) input.placeholder = "https://your-meeting-link.com/join";
    if (noteEl)
      noteEl.textContent =
        "Paste any video conferencing link (Teams, Webex, etc.)";
  } else if (platform === "zoom") {
    genBtn.textContent = "⚡ Generate Zoom link";
    genBtn.style.display = "";
    openBtn.style.display = "";
    if (input) input.placeholder = "https://zoom.us/j/123456789";
    if (noteEl)
      noteEl.textContent =
        "💡 Click Generate to create a real Zoom meeting instantly.";
  } else {
    genBtn.textContent = "⚡ Generate Meet link";
    genBtn.style.display = "";
    openBtn.style.display = "";
    if (input) input.placeholder = "https://meet.google.com/xxx-xxxx-xxx";
    if (noteEl)
      noteEl.textContent = gcalSignedIn
        ? "💡 A real Google Meet room will be created when you save (GCal connected)."
        : "💡 Generate a placeholder link, or open Google Meet to create a room.";
  }
}

async function generateIvMeetingLink() {
  const input = document.getElementById("iv-meeting-link");
  const preview = document.getElementById("iv-link-preview");
  const anchor = document.getElementById("iv-link-anchor");
  const genBtn = document.getElementById("iv-btn-gen-link");
  let url = "";

  if (_ivPlatform === "zoom") {
    // Real Zoom meeting via Server-to-Server OAuth
    if (genBtn) {
      genBtn.disabled = true;
      genBtn.textContent = "Creating…";
    }
    try {
      // Build start time from the date/time fields if available
      const dateVal =
        document.getElementById("iv-date")?.value ||
        new Date().toISOString().slice(0, 10);
      const timeVal =
        document.getElementById("iv-start-time")?.value || "09:00";
      const startISO = `${dateVal}T${timeVal}:00`;
      const taskId = window._editingTaskId;
      const task = TASKS.find((x) => x.id === taskId);
      const topic = task
        ? `Interview – ${task.applicant_name || task.name}`
        : "Interview";
      url = await zoomCreateMeeting({ topic, startISO });
      showToast("✅ Real Zoom meeting created!");
    } catch (err) {
      console.error("[Zoom] ❌ Could not create meeting:", err);
      showToast("❌ Zoom meeting creation failed — check console.");
      if (genBtn) {
        genBtn.disabled = false;
        genBtn.textContent = "⚡ Generate Zoom link";
      }
      return;
    }
    if (genBtn) {
      genBtn.disabled = false;
      genBtn.textContent = "⚡ Generate Zoom link";
    }
  } else if (_ivPlatform === "meet") {
    if (gcalSignedIn) {
      // Real Meet room will be auto-created when the event is saved to GCal
      showToast(
        "💡 A real Google Meet room will be created automatically when you save.",
      );
      return;
    }
    // Fallback placeholder if not connected to GCal
    const r = () => Math.random().toString(36).slice(2, 5).toLowerCase();
    url = `https://meet.google.com/${r()}-${r()}-${r()}`;
    showToast(
      "⚡ Placeholder generated — connect Google Calendar to auto-create real rooms.",
    );
  }

  if (!url) return;
  if (input) input.value = url;
  if (anchor) {
    anchor.href = url;
    anchor.textContent = "Join Meeting";
  }
  if (preview) preview.style.display = "block";
}

function openIvPlatform() {
  const url =
    _ivPlatform === "zoom"
      ? "https://zoom.us/meeting/schedule"
      : "https://meet.google.com/new";
  window.open(url, "_blank", "noopener");
}

/** Save a new interview from the Interview tab form into calEvents */
function saveInterviewSchedule() {
  const taskId = window._editingTaskId;
  const task = TASKS.find((x) => x.id === taskId);
  if (!task) return;

  const date = document.getElementById("iv-date").value;
  const startTime = document.getElementById("iv-start-time").value;
  const endTime =
    document.getElementById("iv-end-time").value || ivAutoEndTime(startTime);
  const type = document.getElementById("iv-type").value;
  const status = document.getElementById("iv-status").value;
  const meetingLink = document.getElementById("iv-meeting-link").value.trim();
  const interviewer = document.getElementById("iv-interviewer").value.trim();
  const notes = document.getElementById("iv-notes").value.trim();
  const isVirtual = meetingLink.length > 0;

  if (!date || !startTime) {
    showToast("⚠️ Please enter a date and start time.");
    return;
  }

  const ev = {
    id: Date.now(),
    taskId: task.id,
    applicant_name: task.applicant_name || task.name || "",
    name: task.applicant_name || task.name || "",
    position: task.position || "",
    title: `${type} — ${task.applicant_name || task.name || ""}`,
    date,
    time: startTime,
    start_time: startTime,
    end_time: endTime,
    round: type,
    interview_type: type,
    type: isVirtual ? "Virtual" : "Face-to-Face",
    status,
    interviewer,
    meeting_link: meetingLink,
    meetingLink,
    notes,
    isGoogleEvent: false,
  };

  calEvents.push(ev);
  persistSave();

  // Reset link + notes but keep date/type/interviewer for consecutive scheduling
  document.getElementById("iv-meeting-link").value = "";
  document.getElementById("iv-notes").value = "";
  document.getElementById("iv-status").value = "Scheduled";
  const ivPreview = document.getElementById("iv-link-preview");
  if (ivPreview) ivPreview.style.display = "none";

  _renderIvSavedList(task);
  showToast("✅ Interview scheduled!");
}

/** Delete a saved interview event from the Interview tab list */
async function deleteIvScheduleEvent(eventId) {
  if (
    !(await uiConfirm("This interview will be removed from the schedule.", {
      icon: "📅",
      title: "Remove Interview?",
      okText: "Remove",
      okDanger: true,
    }))
  )
    return;
  calEvents = calEvents.filter((e) => e.id !== eventId);
  persistSave();
  const task = TASKS.find((x) => x.id === window._editingTaskId);
  if (task) _renderIvSavedList(task);
  showToast("🗑️ Interview removed.");
}

/** Populate all 3 sections of the Review tab */
function _populateReviewTab(task) {
  if (!task) return;
  _renderReviewScheduledList(task);
  _renderReviewAssessmentSummary(task);
  _renderReviewOverallSummary(task);
}

/** Section 1 — Scheduled interviews from calEvents matching this applicant */
function _renderReviewScheduledList(task) {
  const el = document.getElementById("rv-scheduled-list");
  if (!el) return;
  const name = (task.applicant_name || task.name || "").toLowerCase();
  const matched = calEvents
    .filter(
      (e) =>
        (e.applicant_name || e.name || "").toLowerCase().includes(name) ||
        e.taskId === task.id,
    )
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  if (!matched.length) {
    el.innerHTML = `<div style="font-size:12px;color:var(--light);padding:6px 0 4px;">No interviews scheduled yet. Use the Calendar to add one.</div>`;
    return;
  }
  el.innerHTML = matched
    .map((e) => {
      const color = getEventColor(e);
      const ml = e.meeting_link || e.meetingLink || "";
      return `<div class="rv-interview-item" style="border-left:3px solid ${color};">
      <div class="rv-interview-item-title">${sanitize(e.title || e.name) || "Interview"}</div>
      <div class="rv-interview-item-meta">
        📅 ${e.date || "—"} &nbsp; ⏰ ${fmtTime(e.time || e.start_time || "")}
        &nbsp; ${e.type === "Virtual" ? "💻 Virtual" : "🏢 On-site"}
        ${ml ? `&nbsp; <a href="${ml}" target="_blank" style="color:var(--cyan);font-weight:700;">Join Meeting</a>` : ""}
      </div>
    </div>`;
    })
    .join("");
}

/** Section 2 — Assessment scores + portal status */
function _renderReviewAssessmentSummary(task) {
  const el = document.getElementById("rv-assessment-summary");
  if (!el) return;
  const typing = task.typing_score || "";
  const knowledge = task.knowledge_score || "";
  const verbal = task.verbal_link || "";
  const notes = task.interview_notes || "";
  const completed = task.assess_completed;
  const sent = task.assess_sent_at;

  const statusBadge = completed
    ? `<span class="assess-status-badge completed">✔ Completed</span>`
    : sent
      ? `<span class="assess-status-badge sent">● Sent</span>`
      : `<span class="assess-status-badge not-sent">○ Not Sent</span>`;

  const hasScores = typing || knowledge || verbal;
  el.innerHTML = `
    <div class="rv-assess-row"><span class="rv-assess-label">Portal Status</span>${statusBadge}</div>
    ${typing ? `<div class="rv-assess-row"><span class="rv-assess-label">⌨️ Typing Test</span><span class="rv-assess-val">${typing} WPM</span></div>` : ""}
    ${(() => {
      if (!knowledge) return "";
      const kNum = parseInt(knowledge) || 0;
      const passed = kNum >= 75;
      const rc = passed ? "var(--green)" : "#ef4444";
      const rb = passed ? "rgba(67,233,123,.12)" : "rgba(239,68,68,.1)";
      return `<div class="rv-assess-row"><span class="rv-assess-label">📝 Knowledge Test</span><div style="display:flex;align-items:center;gap:6px;"><span class="rv-assess-val">${knowledge} / 100</span><span style="font-size:10px;font-weight:800;font-family:'Montserrat',sans-serif;padding:2px 8px;border-radius:99px;background:${rb};color:${rc};">${passed ? "✓ PASSED" : "✗ FAILED"}</span></div></div>`;
    })()}
    ${verbal ? `<div class="rv-assess-row"><span class="rv-assess-label">🎙️ Verbal Test</span><a href="${verbal}" target="_blank" style="color:var(--cyan);font-weight:700;font-size:12px;">View Recording</a></div>` : ""}
    ${notes ? `<div class="rv-assess-row rv-assess-row-full"><span class="rv-assess-label">💬 Interview Notes</span><span class="rv-assess-val" style="font-weight:400;color:var(--muted);">${notes}</span></div>` : ""}
    ${!hasScores && !completed ? `<div style="font-size:12px;color:var(--light);padding:4px 0;">No scores recorded yet.</div>` : ""}
  `;
}

/** Section 3 — Full applicant profile snapshot */
function _renderReviewOverallSummary(task) {
  const el = document.getElementById("rv-overall-summary");
  if (!el) return;
  const priorityColor =
    { Low: "#64748b", Medium: "#f59e0b", High: "#f97316", Urgent: "#ef4444" }[
      task.priority
    ] || "var(--muted)";
  const resume = task.resume_link || "";
  const portfolio = task.portfolio_link || "";

  el.innerHTML = `
    <div class="rv-summary-row"><span class="rv-summary-label">Position</span><span class="rv-summary-val">${task.position || "—"}</span></div>
    <div class="rv-summary-row"><span class="rv-summary-label">Stage</span><span class="rv-summary-val">${task.status || "—"}</span></div>
    <div class="rv-summary-row"><span class="rv-summary-label">Priority</span><span class="rv-summary-val" style="color:${priorityColor};font-weight:700;">${task.priority || "—"}</span></div>
    <div class="rv-summary-row"><span class="rv-summary-label">Assignee</span><span class="rv-summary-val">${task.assignee || "—"}</span></div>
    <div class="rv-summary-row"><span class="rv-summary-label">Applied Date</span><span class="rv-summary-val">${task.application_date || task.start || "—"}</span></div>
    <div class="rv-summary-row"><span class="rv-summary-label">Folder</span><span class="rv-summary-val">${task.candidateFolder || "—"}</span></div>
    <div class="rv-summary-row"><span class="rv-summary-label">Email</span><span class="rv-summary-val">${task.applicant_email || "—"}</span></div>
    <div class="rv-summary-row"><span class="rv-summary-label">Phone</span><span class="rv-summary-val">${task.applicant_phone || "—"}</span></div>
    ${resume ? `<div class="rv-summary-row"><span class="rv-summary-label">Resume</span><a href="${resume}" target="_blank" style="color:var(--cyan);font-size:12px;font-weight:700;">View Resume</a></div>` : ""}
    ${portfolio ? `<div class="rv-summary-row"><span class="rv-summary-label">Portfolio</span><a href="${portfolio}" target="_blank" style="color:var(--cyan);font-size:12px;font-weight:700;">View Portfolio</a></div>` : ""}
  `;
}

function closeTaskModal() {
  document.getElementById("task-modal-overlay").classList.remove("open");
}
document
  .getElementById("task-modal-close")
  .addEventListener("click", closeTaskModal);
document
  .getElementById("task-modal-cancel")
  .addEventListener("click", closeTaskModal);
document
  .getElementById("task-modal-overlay")
  .addEventListener("click", function (e) {
    if (e.target === this) closeTaskModal();
  });
document
  .getElementById("btn-add-task")
  .addEventListener("click", () => openTaskNew());

// Live-update stage progress bar when user changes the status dropdown
document.getElementById("f-status").addEventListener("change", function () {
  document.getElementById("task-stage-progress").innerHTML = buildStageProgress(
    this.value,
  );
  _updatePipelineActions(window._editingTaskId, this.value);
  _updateInterviewScheduleTab(this.value);
  _updateReviewTab(this.value);
});

// Update assessment panel when position changes
document.getElementById("f-position")?.addEventListener("change", function () {
  _updateAssessmentPanel(this.value);
});

// Verbal link live preview
document
  .getElementById("f-verbal-link")
  ?.addEventListener("input", function () {
    _updateVerbalPreview(this.value);
  });

document.getElementById("btn-task-save").addEventListener("click", async () => {
  const name = document.getElementById("f-name").value.trim();
  if (!name) {
    await uiAlert("Please enter the applicant's name.", {
      icon: "⚠️",
      title: "Name Required",
    });
    return;
  }
  const newStatus = document.getElementById("f-status").value;
  const dueDate = document.getElementById("f-due").value;
  const sync = document.getElementById("f-task-gcal-sync")?.checked;
  const statusEl = document.getElementById("f-task-gcal-status");

  // Guard: GCal sync requires a due date
  if (sync && !dueDate) {
    if (statusEl) {
      statusEl.style.display = "block";
      statusEl.textContent =
        "⚠️ A due date is required to sync to Google Calendar.";
      statusEl.style.color = "var(--orange)";
    }
    document.getElementById("f-due").focus();
    return;
  }

  const existing = taskEditId ? TASKS.find((x) => x.id === taskEditId) : null;
  const applicantName = document.getElementById("f-name").value.trim();
  const t = {
    id: taskEditId || taskNextId++,
    name: applicantName,
    applicant_name: applicantName,
    status: newStatus,
    priority: document.getElementById("f-priority").value,
    position: document.getElementById("f-position").value,
    assignee: document.getElementById("f-assignee").value,
    start: document.getElementById("f-start").value,
    due: dueDate,
    notes: document.getElementById("f-notes").value,
    candidateFolder: document.getElementById("f-folder").value || undefined,
    gcalEventId: existing?.gcalEventId || null,
    // Applicant profile
    applicant_email:
      document.getElementById("f-email")?.value?.trim() ||
      existing?.applicant_email ||
      "",
    applicant_phone:
      document.getElementById("f-phone")?.value?.trim() ||
      existing?.applicant_phone ||
      "",
    resume_link:
      document.getElementById("f-resume")?.value?.trim() ||
      existing?.resume_link ||
      "",
    portfolio_link:
      document.getElementById("f-portfolio")?.value?.trim() ||
      existing?.portfolio_link ||
      "",
    application_date:
      document.getElementById("f-app-date")?.value ||
      existing?.application_date ||
      "",
    // Assessment scores
    typing_score:
      document.getElementById("f-typing-score")?.value ||
      existing?.typing_score ||
      "",
    knowledge_score:
      document.getElementById("f-knowledge-score")?.value ||
      existing?.knowledge_score ||
      "",
    verbal_link:
      document.getElementById("f-verbal-link")?.value?.trim() ||
      existing?.verbal_link ||
      "",
    interview_notes:
      document.getElementById("f-interview-notes")?.value ||
      existing?.interview_notes ||
      "",
    // Preserve pipeline timestamps
    hired_at:
      existing?.hired_at ||
      (newStatus === "Hired" ? new Date().toISOString() : ""),
    rejected_at:
      existing?.rejected_at ||
      (newStatus === "Rejected" ? new Date().toISOString() : ""),
    archived:
      existing?.archived || ["Rejected", "Cancelled"].includes(newStatus),
    stage_changed_at:
      newStatus !== existing?.status
        ? new Date().toISOString()
        : existing?.stage_changed_at,
  };

  if (taskEditId) {
    const i = TASKS.findIndex((x) => x.id === taskEditId);
    if (i > -1) TASKS[i] = t;
    showToast("✅ Task updated!");
  } else {
    TASKS.push(t);
    showToast("✅ Task added!");
  }
  persistSave();

  // ── Optional GCal sync ──
  if (sync && dueDate) {
    if (!gcalSignedIn) {
      showToast("💡 Connect Google Calendar first to sync applicants.");
    } else {
      if (statusEl) {
        statusEl.style.display = "block";
        statusEl.textContent = "Syncing to Google Calendar…";
        statusEl.style.color = "var(--cyan)";
      }
      try {
        await _taskSyncToGcal(t);
        if (statusEl) {
          statusEl.style.display = "block";
          statusEl.textContent = "✅ Synced to Google Calendar!";
          statusEl.style.color = "var(--green)";
        }
        await new Promise((r) => setTimeout(r, 600));
      } catch (err) {
        console.error("[GCal Task Sync]", err);
        if (statusEl) {
          statusEl.style.display = "block";
          statusEl.textContent =
            "⚠️ GCal sync failed — applicant saved locally.";
          statusEl.style.color = "var(--orange)";
        }
        await new Promise((r) => setTimeout(r, 1400));
      }
    }
  }

  // ── If status changed to Cancelled and event is in GCal, mark the GCal event as cancelled ──
  if (
    newStatus === "Cancelled" &&
    t.gcalEventId &&
    gcalSignedIn &&
    gapi?.client?.calendar
  ) {
    try {
      const calId = UPSTAFF_CALENDARS[0]?.calendarId || "primary";
      await gapi.client.calendar.events.patch({
        calendarId: calId,
        eventId: t.gcalEventId,
        resource: { status: "cancelled", summary: `❌ [Cancelled] ${t.name}` },
      });
      showToast("☁️ Google Calendar event marked cancelled.");
    } catch (e) {
      console.warn("[GCal] Could not cancel GCal event:", e);
    }
  }

  closeTaskModal();
  refreshCurrentView();
});

document
  .getElementById("btn-task-delete")
  .addEventListener("click", async () => {
    if (!taskEditId) return;
    const t = TASKS.find((x) => x.id === taskEditId);
    if (
      await uiConfirm("This applicant will be permanently deleted.", {
        icon: "🗑️",
        title: `Delete "${t?.name}"?`,
        okText: "Delete",
        okDanger: true,
      })
    ) {
      // Remove from GCal if synced
      if (t?.gcalEventId && gcalSignedIn && gapi?.client?.calendar) {
        try {
          const calId = UPSTAFF_CALENDARS[0]?.calendarId || "primary";
          await gapi.client.calendar.events.delete({
            calendarId: calId,
            eventId: t.gcalEventId,
          });
          calEvents = calEvents.filter(
            (e) => e.google_event_id !== t.gcalEventId,
          );
          persistSave();
        } catch (e) {
          console.warn("[GCal] Delete failed:", e);
        }
      }
      TASKS = TASKS.filter((x) => x.id !== taskEditId);
      persistSave();
      closeTaskModal();
      refreshCurrentView();
      showToast("🗑️ Task deleted.");
    }
  });

/* ──────────────────────────────────────────────
   RECRUITMENT TASK → GOOGLE CALENDAR SYNC
   Creates or updates a Google Calendar event for a TASK (applicant record).
   • INSERT when t.gcalEventId is absent
   • PATCH  when t.gcalEventId is present (no duplicates)
   • Stores returned event id back on TASKS[i].gcalEventId
────────────────────────────────────────────── */
async function _taskSyncToGcal(t) {
  if (!gcalSignedIn || !gapi?.client?.calendar)
    throw new Error("GCal not initialised");
  const calId = UPSTAFF_CALENDARS[0]?.calendarId || "primary";

  const statusEmoji = {
    Applied: "📋",
    Screening: "🔍",
    Assessment: "📝",
    Interview: "🎤",
    Review: "👀",
    Hired: "✅",
    Rejected: "❌",
    Cancelled: "🚫",
    "To Do": "📋",
    "In Progress": "🔄",
    "In Review": "👀",
    Done: "✅",
  };
  const resource = {
    summary: `${statusEmoji[t.status] || "📋"} ${t.name}`,
    description: [
      `Position: ${t.position}`,
      `Status: ${t.status}`,
      `Priority: ${t.priority}`,
      `Assignee: ${t.assignee}`,
      t.notes ? `Notes: ${t.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    start: t.start ? { date: t.start } : { date: t.due || todayStr() },
    end: { date: t.due || t.start || todayStr() },
    colorId:
      t.status === "Hired"
        ? "2"
        : t.status === "Rejected" || t.status === "Cancelled"
          ? "8"
          : t.status === "Review" || t.status === "Interview"
            ? "6"
            : "1",
    // Set a reminder for the due date
    reminders: {
      useDefault: false,
      overrides: t.due
        ? [
            { method: "email", minutes: 1440 },
            { method: "popup", minutes: 60 },
          ]
        : [],
    },
  };

  let gcalId;
  if (t.gcalEventId) {
    // UPDATE existing event
    try {
      const resp = await gapi.client.calendar.events.patch({
        calendarId: calId,
        eventId: t.gcalEventId,
        resource,
      });
      gcalId = resp.result.id;
    } catch (patchErr) {
      if (patchErr?.status === 404 || patchErr?.result?.error?.code === 404) {
        const resp = await gapi.client.calendar.events.insert({
          calendarId: calId,
          resource,
        });
        gcalId = resp.result.id;
      } else {
        throw patchErr;
      }
    }
    // Sync the local cal shadow event
    const lev = calEvents.find((e) => e.google_event_id === t.gcalEventId);
    if (lev) {
      lev.title = resource.summary;
      lev.date = t.due || t.start;
      persistSave();
    }
  } else {
    // CREATE new event
    const resp = await gapi.client.calendar.events.insert({
      calendarId: calId,
      resource,
    });
    gcalId = resp.result.id;
    // Inject a local shadow event so Calendar view shows it immediately
    calEvents.push({
      id: calNextId++,
      google_event_id: gcalId,
      calendarId: calId,
      isGoogleEvent: false,
      isTaskEvent: true,
      title: resource.summary,
      name: t.name,
      applicant_name: t.name,
      position: t.position,
      date: t.due || t.start || todayStr(),
      time: "09:00",
      start_time: "09:00",
      end_time: "09:30",
      type: "Task",
      round: t.status,
      interview_stage: t.status,
      status:
        t.status === "Done"
          ? "Completed"
          : t.status === "Cancelled"
            ? "Cancelled"
            : "Scheduled",
      interviewer: t.assignee,
      notes: t.notes || "",
      meetingLink: "",
      meeting_link: "",
    });
    persistSave();
  }

  // Write gcalEventId back to TASKS
  const idx = TASKS.findIndex((x) => x.id === t.id);
  if (idx > -1) {
    TASKS[idx].gcalEventId = gcalId;
    t.gcalEventId = gcalId;
  }
  persistSave();

  // Refresh calendar view if visible
  const calTab = document.querySelector('.view-tab[data-view="calendar"]');
  if (calTab?.classList.contains("active")) renderCalendar();
}

function refreshCurrentView() {
  const active = document.querySelector(".view-tab.active")?.dataset.view;
  if (active === "list") renderList();
  else if (active === "board") renderBoard();
  else if (active === "table") renderTable();
  // Calendar rerenders via its own events; no action needed here.
}

/* ══════════════════════════════════════════════
   HR OPS & ONBOARDING — DATA & RENDERING
══════════════════════════════════════════════ */

// Default onboarding checklist template
const DEFAULT_CHECKLIST = [
  "Contract signed",
  "ID verification completed",
  "Equipment issued",
  "System accounts created",
  "Orientation completed",
  "Benefits enrollment",
  "Team introduction",
  "First-week check-in",
];

/* DEFAULT_TRAINING removed */

// Document types
const DOC_TYPES = [
  { name: "Employment Contract", icon: "📄", color: "#6c63ff" },
  { name: "Government ID Copy", icon: "🪪", color: "#44d7e9" },
  { name: "SSS / PhilHealth / TIN", icon: "📋", color: "#43e97b" },
  { name: "NBI Clearance", icon: "🔏", color: "#fa8231" },
  { name: "Biodata / Resume", icon: "📝", color: "#ff6584" },
];

/* Generate a placeholder Google Drive-style link for a doc */
function autoGenDocLink(empName, docName) {
  const slug = (empName + "-" + docName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://drive.google.com/drive/search?q=${encodeURIComponent(empName + " " + docName)}`;
}

function saveDocLink(empId, idx, link) {
  const e = EMPLOYEES.find((x) => x.id === empId);
  if (!e || !e.docs[idx]) return;
  e.docs[idx].link = link.trim();
  empPersistSave();
  showToast("✅ Document link saved!");
  openEmpDetail(empId);
}

// In-memory employees store
const LS_EMP_KEY = "upstaff_employees";
let EMPLOYEES = [];
let empNextId = 1;

function empPersistLoad() {
  let hasSavedData = false;
  try {
    const raw = localStorage.getItem(LS_EMP_KEY);
    if (raw) {
      hasSavedData = true;
      const d = JSON.parse(raw);
      EMPLOYEES = d.employees || [];
      empNextId =
        d.nextId ||
        (EMPLOYEES.length ? Math.max(...EMPLOYEES.map((e) => e.id)) + 1 : 1);
    }
  } catch (e) {
    dbg("[empPersistLoad] localStorage read failed:", e);
  }
  // Only seed mock data on first-ever load (no saved data in localStorage)
  // If the user cleared employees manually, respect that — don't re-inject mock data
  if (!hasSavedData) seedDemoEmployees();
}

function empPersistSave() {
  try {
    localStorage.setItem(
      LS_EMP_KEY,
      JSON.stringify({ employees: EMPLOYEES, nextId: empNextId }),
    );
  } catch (e) {
    dbg("[empPersistSave] localStorage write failed:", e);
  }
}

function seedDemoEmployees() {
  // No mock data — onboarding is populated only by hiring applicants through the pipeline
  // This function is called only on first-ever load (no localStorage key present)
  EMPLOYEES = [];
  empPersistSave();
}

empPersistLoad();

const EMP_STATUS_META = {
  Active: { color: "#43e97b", bg: "rgba(67,233,123,.12)", label: "Active" },
  Pending: { color: "#44d7e9", bg: "rgba(68,215,233,.12)", label: "Pending" },
  Completed: {
    color: "#6c63ff",
    bg: "rgba(108,99,255,.12)",
    label: "Completed",
  },
  // Legacy alias — "In Training" was removed from UI; maps to Active for old saved data
  "In Training": {
    color: "#43e97b",
    bg: "rgba(67,233,123,.12)",
    label: "Active",
  },
};

function showOnboarding() {
  PROJECT_VIEWS.forEach((id) => {
    const el = document.getElementById(
      id === "mytasks" ? "view-todos" : "view-" + id,
    );
    if (el) el.style.display = "none";
  });
  ["view-settings", "view-analytics", "view-candidates"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  document.getElementById("view-bar").style.display = "none";
  document
    .querySelectorAll(".view-tab")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("view-onboarding").style.display = "block";
  document.getElementById("crumb-parent").textContent = "HR";
  document.getElementById("crumb-current").textContent = "Onboarding";
  document.getElementById("btn-add-task").style.display = "none";
  document.getElementById("topbar-filter-btn").style.display = "none";
  renderOnboarding();
}

// showHROps() removed — was dead redirect to showOnboarding()
function renderOnboarding() {
  const filterStatus =
    document.getElementById("onboarding-filter-status")?.value || "";
  let emps = EMPLOYEES.filter(
    (e) => !filterStatus || e.status === filterStatus,
  );

  const statsRow = document.getElementById("onboarding-stats-row");
  if (statsRow) {
    const s = {
      total: EMPLOYEES.length,
      active: 0,
      pending: 0,
      completed: 0,
    };
    EMPLOYEES.forEach((e) => {
      if (e.status === "Active" || e.status === "In Training")
        s.active++; // In Training maps to Active
      else if (e.status === "Pending") s.pending++;
      else if (e.status === "Completed") s.completed++;
    });
    statsRow.innerHTML = `
      <div class="hr-stat-card"><div class="hr-stat-val">${s.total}</div><div class="hr-stat-label">Total Employees</div></div>
      <div class="hr-stat-card"><div class="hr-stat-val" style="color:#43e97b;">${s.active}</div><div class="hr-stat-label">Active</div><div class="hr-stat-badge" style="background:rgba(67,233,123,.1);color:#43e97b;">Onboarded</div></div>

      <div class="hr-stat-card"><div class="hr-stat-val" style="color:#44d7e9;">${s.pending}</div><div class="hr-stat-label">Pending Start</div></div>
      <div class="hr-stat-card"><div class="hr-stat-val" style="color:#6c63ff;">${s.completed}</div><div class="hr-stat-label">Completed</div><div class="hr-stat-badge" style="background:rgba(108,99,255,.1);color:#6c63ff;">✓ Done</div></div>
    `;
  }

  const grid = document.getElementById("onboarding-grid");
  if (!grid) return;
  if (emps.length === 0) {
    grid.innerHTML = `<div class="list-empty-state" style="grid-column:1/-1;padding:60px 20px;"><div class="list-empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div class="list-empty-title">No employees found</div><div class="list-empty-sub">Add a new hire to get started</div></div>`;
    return;
  }
  grid.innerHTML = emps.map((e) => buildEmployeeCard(e)).join("");
}

function buildEmployeeCard(e) {
  const sm = EMP_STATUS_META[e.status] || EMP_STATUS_META["Pending"];
  const ac = avatarColor(e.fname + " " + e.lname);
  const initParts = [(e.fname || "?")[0], (e.lname || "?")[0]]
    .join("")
    .toUpperCase();
  const checklist = e.checklist || [];
  const doneCnt = checklist.filter((c) => c.done).length;
  const pct = checklist.length
    ? Math.round((doneCnt / checklist.length) * 100)
    : 0;
  const statusCls =
    {
      Active: "status-active",
      "In Training": "status-active", // legacy alias
      Pending: "status-pending",
      Completed: "status-completed",
    }[e.status] || "status-pending";
  return `<div class="employee-card ${statusCls}" onclick="openEmpDetail(${e.id})">
    <div class="employee-card-top">
      <div class="employee-avatar-lg" style="background:${ac};">${initParts}</div>
      <div style="flex:1;min-width:0;">
        <div class="employee-name">${sanitize(e.fname)} ${sanitize(e.lname)}</div>
        <div class="employee-position">${sanitize(e.position)} · ${sanitize(e.dept) || "—"}</div>
        <div class="employee-start">Started: ${e.start ? new Date(e.start + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</div>
      </div>
      <div class="employee-status-badge" style="background:${sm.bg};color:${sm.color};">${sm.label}</div>
    </div>
    <div class="checklist-progress-label"><span>Onboarding Progress</span><span>${doneCnt}/${checklist.length}</span></div>
    <div class="checklist-progress-bar"><div class="checklist-progress-fill" style="width:${pct}%;"></div></div>
    <div class="checklist-items">
      ${checklist
        .slice(0, 4)
        .map(
          (c, i) => `
        <div class="checklist-item ${c.done ? "done" : ""}" onclick="event.stopPropagation();toggleChecklistItem(${e.id},${i})">
          <div class="checklist-item-check">${c.done ? `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>` : ""}</div>
          <span class="checklist-item-text">${sanitize(c.item)}</span>
        </div>`,
        )
        .join("")}
      ${checklist.length > 4 ? `<div style="font-size:11px;color:var(--light);padding:4px 6px;">+ ${checklist.length - 4} more items…</div>` : ""}
    </div>
  </div>`;
}

function toggleChecklistItem(empId, idx) {
  const e = EMPLOYEES.find((x) => x.id === empId);
  if (!e || !e.checklist[idx]) return;
  e.checklist[idx].done = !e.checklist[idx].done;
  const pct = e.checklist.filter((c) => c.done).length / e.checklist.length;
  if (pct >= 1 && e.status !== "Completed") {
    e.status = "Completed";
    showToast("🎉 Onboarding completed!");
  } else if (pct > 0 && e.status === "Pending") e.status = "Active";
  empPersistSave();
  renderOnboarding();
}

function renderHROps_REMOVED() {
  const statsRow = document.getElementById("hrops-stats-row");
  if (statsRow) {
    const total = EMPLOYEES.length;
    const active = EMPLOYEES.filter(
      (e) =>
        e.status === "Active" ||
        e.status === "In Training" || // legacy alias
        e.status === "Pending",
    ).length;
    const docsPending = EMPLOYEES.reduce(
      (acc, e) => (e.docs || []).filter((d) => !d.uploaded).length + acc,
      0,
    );
    statsRow.innerHTML = `
      <div class="hr-stat-card"><div class="hr-stat-val">${total}</div><div class="hr-stat-label">Total Staff</div></div>
      <div class="hr-stat-card"><div class="hr-stat-val" style="color:#43e97b;">${active}</div><div class="hr-stat-label">Currently Active</div></div>
      <div class="hr-stat-card"><div class="hr-stat-val" style="color:#fa8231;">${docsPending}</div><div class="hr-stat-label">Documents Pending</div></div>
    `;
  }

  const empGrid = document.getElementById("hrops-employee-grid");
  if (empGrid)
    empGrid.innerHTML = EMPLOYEES.map((e) => buildEmployeeCard(e)).join("");

  const docList = document.getElementById("hr-doc-list");
  if (docList) {
    const allDocs = [];
    EMPLOYEES.forEach((e) =>
      (e.docs || []).forEach((d) =>
        allDocs.push({ ...d, empName: sanitize(`${e.fname} ${e.lname}`) }),
      ),
    );
    docList.innerHTML = allDocs
      .map(
        (d) => `
      <div class="doc-item">
        <div class="doc-item-icon" style="background:${d.color}22;color:${d.color};">${d.icon}</div>
        <div class="doc-item-name">${sanitize(d.name)} <span style="font-size:10px;color:var(--light);font-weight:400;">— ${d.empName}</span></div>
        <span class="doc-item-status" style="cursor:pointer;background:${d.uploaded ? "rgba(67,233,123,.15)" : "rgba(250,130,49,.12)"};color:${d.uploaded ? "#43e97b" : "#fa8231"};">${d.uploaded ? "✓ Uploaded" : "Pending"}</span>
      </div>`,
      )
      .join("");
  }

  /* hrops training grid removed */
}

// switchHRTab() removed — HR Ops tab section no longer in UI

// filterOnboarding() removed — was a no-op toast placeholder

/* ── New Hire Modal ── */
function openHireModal() {
  const hfPos = document.getElementById("hf-position");
  if (hfPos)
    hfPos.innerHTML = JOB_POSITIONS.map(
      (p) => `<option value="${p}">${p}</option>`,
    ).join("");
  const hfStart = document.getElementById("hf-start");
  if (hfStart) hfStart.value = new Date().toISOString().slice(0, 10);
  [
    "hf-fname",
    "hf-lname",
    "hf-email",
    "hf-phone",
    "hf-address",
    "hf-manager",
    "hf-notes",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("hire-modal-overlay").classList.add("open");
}
function closeHireModal() {
  document.getElementById("hire-modal-overlay").classList.remove("open");
}
document
  .getElementById("hire-modal-overlay")
  .addEventListener("click", function (e) {
    if (e.target === this) closeHireModal();
  });

function saveNewHire() {
  // ── Edit mode: update existing employee record ──
  if (_empEditingId != null) {
    const e = EMPLOYEES.find((x) => x.id === _empEditingId);
    if (e) {
      const fname = document.getElementById("hf-fname")?.value.trim();
      const lname = document.getElementById("hf-lname")?.value.trim();
      if (!fname || !lname) {
        showToast("❌ Name is required.");
        return;
      }
      e.fname = fname;
      e.lname = lname;
      e.email = document.getElementById("hf-email")?.value || "";
      e.phone = document.getElementById("hf-phone")?.value || "";
      e.address = document.getElementById("hf-address")?.value || "";
      e.position =
        document.getElementById("hf-position")?.value || JOB_POSITIONS[0];
      e.dept = document.getElementById("hf-dept")?.value || "Customer Service";
      e.emptype =
        document.getElementById("hf-emptype")?.value || "Probationary";
      e.start = document.getElementById("hf-start")?.value || "";
      e.manager = document.getElementById("hf-manager")?.value || "HR Team";
      e.status = document.getElementById("hf-status")?.value || "Pending";
      e.notes = document.getElementById("hf-notes")?.value || "";
      empPersistSave();
      _empEditingId = null;
      const titleEl = document.querySelector(".hire-modal-title");
      if (titleEl) titleEl.textContent = "New Hire Information";
      closeHireModal();
      showToast(`✅ ${fname} ${lname} updated!`);
      if (document.getElementById("view-onboarding").style.display !== "none")
        renderOnboarding();
      return;
    }
    _empEditingId = null;
  }
  // ── Create mode: add new employee ──
  const fname = document.getElementById("hf-fname")?.value.trim();
  const lname = document.getElementById("hf-lname")?.value.trim();
  if (!fname || !lname) {
    showToast("❌ First and last name are required.");
    return;
  }
  const checklist = DEFAULT_CHECKLIST.map((item) => ({ item, done: false }));
  const docs = DOC_TYPES.map((dt) => ({ ...dt, uploaded: false, link: "" }));
  EMPLOYEES.push({
    id: empNextId++,
    fname,
    lname,
    email: document.getElementById("hf-email")?.value || "",
    phone: document.getElementById("hf-phone")?.value || "",
    address: document.getElementById("hf-address")?.value || "",
    position: document.getElementById("hf-position")?.value || JOB_POSITIONS[0],
    dept: document.getElementById("hf-dept")?.value || "Customer Service",
    emptype: document.getElementById("hf-emptype")?.value || "Probationary",
    start:
      document.getElementById("hf-start")?.value ||
      new Date().toISOString().slice(0, 10),
    manager: document.getElementById("hf-manager")?.value || "HR Team",
    status: document.getElementById("hf-status")?.value || "Pending",
    notes: document.getElementById("hf-notes")?.value || "",
    checklist,
    docs,
  });
  empPersistSave();
  closeHireModal();
  showToast(`✅ ${fname} ${lname} added to onboarding!`);
  if (document.getElementById("view-onboarding").style.display !== "none")
    renderOnboarding();
}

/* ── Employee Detail Side Panel ── */
let _empDetailId = null;

function openEmpDetail(empId) {
  const e = EMPLOYEES.find((x) => x.id === empId);
  if (!e) return;
  _empDetailId = empId;
  const sm = EMP_STATUS_META[e.status] || EMP_STATUS_META["Pending"];
  const ac = avatarColor(e.fname + " " + e.lname);
  const initParts = [(e.fname || "?")[0], (e.lname || "?")[0]]
    .join("")
    .toUpperCase();
  const checklist = e.checklist || [];
  const docs = e.docs || [];
  const doneCnt = checklist.filter((c) => c.done).length;
  const pct = checklist.length
    ? Math.round((doneCnt / checklist.length) * 100)
    : 0;
  const startFmt = e.start
    ? new Date(e.start + "T00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  document.getElementById("emp-detail-name").textContent =
    `${e.fname} ${e.lname}`;
  document.getElementById("emp-detail-body").innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border);">
      <div style="width:56px;height:56px;border-radius:16px;background:${ac};display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;font-family:'Montserrat',sans-serif;">${initParts}</div>
      <div style="flex:1;">
        <div style="font-size:16px;font-weight:800;font-family:'Syne',sans-serif;color:var(--text);">${sanitize(e.fname)} ${sanitize(e.lname)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px;">${sanitize(e.position)} · ${sanitize(e.dept) || "—"}</div>
        <span style="display:inline-flex;margin-top:5px;padding:3px 10px;border-radius:99px;font-size:10px;font-weight:700;font-family:'Montserrat',sans-serif;background:${sm.bg};color:${sm.color};">${sm.label}</span>
      </div>
    </div>

    <div class="emp-detail-section">
      <div class="emp-detail-section-title">Employee Information</div>
      <div class="emp-info-grid">
        <div class="emp-info-item"><div class="emp-info-label">Email</div><div class="emp-info-value" style="word-break:break-all;">${sanitize(e.email) || "—"}</div></div>
        <div class="emp-info-item"><div class="emp-info-label">Phone</div><div class="emp-info-value">${sanitize(e.phone) || "—"}</div></div>
        <div class="emp-info-item"><div class="emp-info-label">Start Date</div><div class="emp-info-value">${startFmt}</div></div>
        <div class="emp-info-item"><div class="emp-info-label">Employment Type</div><div class="emp-info-value">${sanitize(e.emptype) || "—"}</div></div>
        <div class="emp-info-item"><div class="emp-info-label">Manager</div><div class="emp-info-value">${sanitize(e.manager) || "—"}</div></div>
        <div class="emp-info-item"><div class="emp-info-label">Department</div><div class="emp-info-value">${sanitize(e.dept) || "—"}</div></div>
      </div>
      ${e.notes ? `<div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:var(--surface-3);font-size:12px;color:var(--muted);font-style:italic;">"${sanitize(e.notes)}"</div>` : ""}
    </div>

    <div class="emp-detail-section">
      <div class="emp-detail-section-title">Onboarding Checklist</div>
      <div class="checklist-progress-label"><span>${pct}% Complete</span><span>${doneCnt}/${checklist.length} steps</span></div>
      <div class="checklist-progress-bar" style="margin-bottom:12px;"><div class="checklist-progress-fill" style="width:${pct}%;"></div></div>
      <div class="checklist-items">
        ${checklist
          .map(
            (c, i) => `
          <div class="checklist-item ${c.done ? "done" : ""}" onclick="toggleChecklistItemDetail(${e.id},${i})">
            <div class="checklist-item-check">${c.done ? `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>` : ""}</div>
            <span class="checklist-item-text">${c.item}</span>
          </div>`,
          )
          .join("")}
      </div>
    </div>



    <div class="emp-detail-section">
      <div class="emp-detail-section-title">Documents</div>
      <div class="doc-list">
        ${docs
          .map((d, i) => {
            const hasLink = d.link && d.link.trim();
            return `<div class="doc-item" style="flex-direction:column;align-items:stretch;gap:8px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div class="doc-item-icon" style="background:${d.color}22;color:${d.color};">${d.icon}</div>
              <div class="doc-item-name">${sanitize(d.name)}</div>
              <span class="doc-item-status" style="background:${d.uploaded ? "rgba(67,233,123,.15)" : "rgba(250,130,49,.12)"};color:${d.uploaded ? "#43e97b" : "#fa8231"};cursor:pointer;flex-shrink:0;" onclick="toggleDocUploaded(${e.id},${i})" title="Click to toggle">${d.uploaded ? "✓ Uploaded" : "Pending"}</span>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              <input type="url" placeholder="Paste or auto-generate link…" value="${sanitize(d.link || "")}"
                style="flex:1;border-radius:8px;border:1.5px solid var(--border);background:var(--surface-3);color:var(--text);font-size:11px;padding:6px 10px;font-family:'DM Sans',sans-serif;"
                onchange="saveDocLink(${e.id},${i},this.value)"
                onblur="saveDocLink(${e.id},${i},this.value)"/>
              <button title="Auto-generate search link" style="flex-shrink:0;height:30px;padding:0 10px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface-2);color:var(--muted);font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:'Montserrat',sans-serif;"
                onclick="(function(){const inp=this.previousElementSibling;const link=autoGenDocLink('${sanitize(e.fname + " " + e.lname)}','${sanitize(d.name)}');inp.value=link;saveDocLink(${e.id},${i},link);}).call(this)">
                🔍 Auto
              </button>
              ${hasLink ? `<a href="${d.link}" target="_blank" rel="noopener" title="Open document" style="flex-shrink:0;height:30px;width:30px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface-2);display:flex;align-items:center;justify-content:center;color:var(--cyan);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>` : ""}
            </div>
          </div>`;
          })
          .join("")}
      </div>
    </div>
  `;

  document.getElementById("emp-detail-overlay").classList.add("open");
}

function toggleChecklistItemDetail(empId, idx) {
  const e = EMPLOYEES.find((x) => x.id === empId);
  if (!e || !e.checklist[idx]) return;
  e.checklist[idx].done = !e.checklist[idx].done;
  const pct = e.checklist.filter((c) => c.done).length / e.checklist.length;
  if (pct >= 1) {
    e.status = "Completed";
    showToast("🎉 Onboarding completed!");
  } else if (pct > 0 && e.status === "Pending") e.status = "Active";
  empPersistSave();
  openEmpDetail(empId);
}

/* toggleTrainingItem removed — training checklist replaced */

function toggleDocUploaded(empId, idx) {
  const e = EMPLOYEES.find((x) => x.id === empId);
  if (!e || !e.docs[idx]) return;
  e.docs[idx].uploaded = !e.docs[idx].uploaded;
  empPersistSave();
  openEmpDetail(empId);
  showToast(
    e.docs[idx].uploaded
      ? "✅ Document marked as uploaded!"
      : "📋 Marked as pending.",
  );
}

function closeEmpDetail(e) {
  if (e.target === document.getElementById("emp-detail-overlay"))
    closeEmpDetailDirect();
}
function closeEmpDetailDirect() {
  document.getElementById("emp-detail-overlay").classList.remove("open");
  _empDetailId = null;
  if (document.getElementById("view-onboarding").style.display !== "none")
    renderOnboarding();
}

/* ══════════════════════════════════════════════
   TABLE VIEW
══════════════════════════════════════════════ */
function renderTable() {
  const search = (
    document.getElementById("table-search").value || ""
  ).toLowerCase();
  let data = [...TASKS].filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search) ||
      t.position.toLowerCase().includes(search) ||
      t.assignee.toLowerCase().includes(search),
  );
  data.sort((a, b) => {
    let va = a[tableSort.col] || "",
      vb = b[tableSort.col] || "";
    return va.localeCompare(vb) * tableSort.dir;
  });
  const cols = [
    { key: "name", label: "Applicant" },
    { key: "applicant_email", label: "Email" },
    { key: "applicant_phone", label: "Phone" },
    { key: "status", label: "Stage" },
    { key: "priority", label: "Priority" },
    { key: "position", label: "Position" },
    { key: "assignee", label: "Assigned To" },
    { key: "application_date", label: "Applied" },
    { key: "due", label: "Due Date" },
    { key: "typing_score", label: "Typing" },
    { key: "knowledge_score", label: "Knowledge" },
  ];
  const thead = `<thead><tr>${cols.map((c) => `<th onclick="sortTable('${c.key}')">${c.label} ${tableSort.col === c.key ? (tableSort.dir === 1 ? "↑" : "↓") : ""}</th>`).join("")}</tr></thead>`;
  if (data.length === 0) {
    document.getElementById("table-el").innerHTML = `
      <tbody><tr><td colspan="11" style="text-align:center;padding:48px 24px;">
        <div style="color:var(--muted);font-size:13px;display:flex;flex-direction:column;align-items:center;gap:8px;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span style="font-weight:600;">No applicants found</span>
          <span style="font-size:11px;opacity:0.6;">Try a different search or add an applicant</span>
        </div>
      </td></tr></tbody>`;
    return;
  }
  const tbody = `<tbody>${data
    .map((t) => {
      const sm = STATUS_META[t.status] || { color: "#9ca3af", bg: "#f3f4f6" };
      const pc = PRIORITY_COLORS[t.priority] || "#ccc";
      const ac = avatarColor(t.assignee);
      const dc = dueCls(t.due);
      const typScore = t.typing_score
        ? `<span style="font-weight:600;color:#44d7e9;">${t.typing_score}</span>`
        : `<span style="color:var(--muted);font-size:11px;">—</span>`;
      const knwScore = t.knowledge_score
        ? (() => {
            const s = parseInt(t.knowledge_score);
            const c = s >= 75 ? "#43e97b" : "#fa4d56";
            return `<span style="font-weight:600;color:${c};">${s}%</span>`;
          })()
        : `<span style="color:var(--muted);font-size:11px;">—</span>`;
      return `<tr onclick="openTaskEdit(${t.id})">
      <td style="font-weight:500;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sanitize(t.name)}</td>
      <td style="font-size:12px;color:var(--muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sanitize(t.applicant_email || "—")}</td>
      <td style="font-size:12px;color:var(--muted);white-space:nowrap;">${sanitize(t.applicant_phone || "—")}</td>
      <td><span class="${statusPillClass(t.status)}">${t.status}</span></td>
      <td><span class="priority-pill" style="background:${pc}22;color:${pc};">${t.priority}</span></td>
      <td>${sanitize(t.position)}</td>
      <td><div class="assignee-chip"><div class="assignee-avatar" style="background:${ac};">${initials(t.assignee)}</div>${sanitize(t.assignee)}</div></td>
      <td style="color:var(--muted);font-size:12px;">${fmtDue(t.application_date || t.start)}</td>
      <td><span class="due-date ${dc}">${fmtDue(t.due)}</span></td>
      <td style="text-align:center;">${typScore}</td>
      <td style="text-align:center;">${knwScore}</td>
    </tr>`;
    })
    .join("")}</tbody>`;
  document.getElementById("table-el").innerHTML = thead + tbody;
}
function sortTable(col) {
  if (tableSort.col === col) tableSort.dir *= -1;
  else {
    tableSort.col = col;
    tableSort.dir = 1;
  }
  renderTable();
}
document
  .getElementById("table-search")
  .addEventListener("input", debounce(renderTable, 200));

/* ── Export CSV ── */
function buildCSVDownload(rows, filename) {
  const csv = rows
    .map((r) =>
      r.map((v) => `"${String(v || "").replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = filename;
  a.click();
}

document.getElementById("export-csv-btn").addEventListener("click", () => {
  const headers = [
    "ID",
    "Applicant Name",
    "Email",
    "Phone",
    "Stage",
    "Priority",
    "Position",
    "Assigned To",
    "Application Date",
    "Start Date",
    "Due Date",
    "Typing Score",
    "Knowledge Score",
    "Assessment Result",
    "Resume Link",
    "Portfolio Link",
    "Interview Notes",
    "General Notes",
    "Candidate Folder",
  ];
  const rows = [headers];
  TASKS.forEach((t) => {
    const ks = t.knowledge_score ? parseInt(t.knowledge_score) : null;
    const assessResult = ks !== null ? (ks >= 75 ? "PASSED" : "FAILED") : "";
    rows.push([
      t.id,
      t.applicant_name || t.name,
      t.applicant_email || "",
      t.applicant_phone || "",
      t.status,
      t.priority,
      t.position,
      t.assignee,
      t.application_date || t.start || "",
      t.start || "",
      t.due || "",
      t.typing_score || "",
      t.knowledge_score ? t.knowledge_score + "%" : "",
      assessResult,
      t.resume_link || "",
      t.portfolio_link || "",
      t.interview_notes || "",
      t.notes || "",
      t.candidateFolder || "",
    ]);
  });
  const date = new Date().toISOString().slice(0, 10);
  buildCSVDownload(rows, `upstaff-applicants-${date}.csv`);
  showToast("📥 CSV exported! " + (rows.length - 1) + " applicants.");
});

/* ══════════════════════════════════════════════
   CALENDAR VIEW  (original logic — unchanged)
══════════════════════════════════════════════ */
function getFiltered() {
  const calFilter = document.getElementById("cal-filter-calendar").value;
  const pos = document.getElementById("cal-filter-position").value;
  const status = document.getElementById("cal-filter-status").value;
  const type = document.getElementById("cal-filter-type").value;
  return calEvents.filter((e) => {
    const evCalId = e.calendarId || e.sourceCalendar || "primary";
    if (hiddenCalendars.has(evCalId)) return false;
    if (calFilter && evCalId !== calFilter) return false;
    if (pos && e.position !== pos) return false;
    if (status && e.status !== status) return false;
    if (type && e.type !== type) return false;
    return true;
  });
}

function renderMonth() {
  const y = calDate.getFullYear(),
    mo = calDate.getMonth();
  const events = getFiltered();
  document.getElementById("cal-month-label").textContent =
    calDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDay = new Date(y, mo, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMo = new Date(y, mo + 1, 0).getDate();
  const prevMoDays = new Date(y, mo, 0).getDate();
  const today = todayStr();
  let html = `<div class="cal-month-grid"><div class="cal-day-headers">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="cal-day-hdr">${d}</div>`).join("")}</div><div class="cal-cells">`;
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevMoDays - i;
    html += `<div class="cal-cell other-month" onclick="calCellClick('${fmtDate(new Date(y, mo - 1, d))}')"><div class="cal-cell-num">${d}</div></div>`;
  }
  for (let d = 1; d <= daysInMo; d++) {
    const ds = `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isT = ds === today;
    const dayEvts = events
      .filter((e) => e.date === ds)
      .sort((a, b) =>
        (a.time || a.start_time || "").localeCompare(
          b.time || b.start_time || "",
        ),
      );
    let evHtml = dayEvts
      .slice(0, 3)
      .map((e) => {
        const bg = getEventColor(e);
        const ml = e.meeting_link || e.meetingLink || "";
        return `<div class="cal-event" style="background:${bg} !important;color:#0f172a !important;border:2px solid ${bg} !important;" onclick="event.stopPropagation();openEdit(${e.id})">
                <div class="cal-event-dot" style="background:rgba(0,0,0,0.3);flex-shrink:0;"></div>
        ${sanitize(e.name.split(" ")[0])} ${fmtTime(e.time || e.start_time)}
        ${ml ? `<span style="margin-left:3px;opacity:.7;" title="Has meeting link">📹</span>` : ""}
      </div>`;
      })
      .join("");
    if (dayEvts.length > 3)
      evHtml += `<div class="cal-more">+${dayEvts.length - 3} more</div>`;
    html += `<div class="cal-cell${isT ? " today" : ""}" onclick="calCellClick('${ds}')"><div class="cal-cell-num">${d}</div>${evHtml}</div>`;
  }
  const total = startDow + daysInMo,
    rem = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= rem; d++) {
    html += `<div class="cal-cell other-month" onclick="calCellClick('${fmtDate(new Date(y, mo + 1, d))}')"><div class="cal-cell-num">${d}</div></div>`;
  }
  html += `</div></div>`;
  // Show empty-state hint if no events at all
  if (calEvents.length === 0) {
    html += `<div style="text-align:center;padding:20px;color:var(--light);font-size:13px;border-top:1px solid var(--border);">
      <div style="font-size:28px;margin-bottom:8px;">📅</div>
      <div style="font-weight:600;color:var(--muted);margin-bottom:4px;">No interviews scheduled yet</div>
      <div>Click <strong>Schedule Interview</strong> to add one, or sync from <strong>Google Calendar</strong>.</div>
    </div>`;
  }
  document.getElementById("cal-main-area").innerHTML = html;
}

function renderWeek() {
  const events = getFiltered();
  const dow = (calDate.getDay() + 6) % 7;
  const monday = new Date(calDate);
  monday.setDate(calDate.getDate() - dow);
  const today = todayStr();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);
  const HH = 52;
  document.getElementById("cal-month-label").textContent =
    `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  let hdrs = `<div class="cal-week-hdr" style="border-right:1px solid #f0f0f0;"></div>`;
  days.forEach((d, i) => {
    const ds = fmtDate(d),
      isT = ds === today;
    hdrs += `<div class="cal-week-hdr"><div class="cal-week-hdr-day">${NAMES[i]}</div><div class="${isT ? "cal-week-hdr-date today-hdr" : "cal-week-hdr-date"}">${d.getDate()}</div></div>`;
  });
  const timeCol = hours
    .map(
      (h) =>
        `<div class="cal-time-slot">${h % 12 || 12}${h < 12 ? "am" : "pm"}</div>`,
    )
    .join("");
  const dayCols = days
    .map((d) => {
      const ds = fmtDate(d);
      const blocks = hours
        .map(
          (h) =>
            `<div class="cal-hour-block" onclick="openNewAt('${ds}','${String(h).padStart(2, "0")}:00')"></div>`,
        )
        .join("");
      const evts = events
        .filter((e) => e.date === ds)
        .map((e) => {
          const [eh, em] = e.time.split(":").map(Number);
          const top = (eh - 7 + em / 60) * HH;
          const bg = getEventColor(e);
          const isDarkW =
            document.documentElement.getAttribute("data-theme") === "dark";
          const evColorW = isDarkW ? "#ffffff" : "#0f172a";
          return `<div class="cal-week-event" style="top:${top}px;height:${HH}px;background:${bg};color:${evColorW};border:1px solid ${bg};" onclick="event.stopPropagation();openEdit(${e.id})">${fmtTime(e.time)} ${sanitize(e.name.split(" ")[0])}</div>`;
        })
        .join("");
      return `<div class="cal-day-col" style="position:relative;">${blocks}${evts}</div>`;
    })
    .join("");
  document.getElementById("cal-main-area").innerHTML =
    `<div class="cal-week-grid"><div class="cal-week-headers">${hdrs}</div><div class="cal-week-body"><div class="cal-time-col">${timeCol}</div>${dayCols}</div></div>`;
}

function renderDay() {
  const events = getFiltered();
  const ds = fmtDate(calDate);
  const dayEvts = events
    .filter((e) => e.date === ds)
    .sort((a, b) => a.time.localeCompare(b.time));
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);
  const HH = 60;
  document.getElementById("cal-month-label").textContent =
    calDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  const timeCol = hours
    .map(
      (h) =>
        `<div class="cal-time-slot" style="height:${HH}px;">${h % 12 || 12}${h < 12 ? "am" : "pm"}</div>`,
    )
    .join("");
  const blocks = hours
    .map(
      (h) =>
        `<div class="cal-day-hour-block" style="height:${HH}px;" onclick="openNewAt('${ds}','${String(h).padStart(2, "0")}:00')"></div>`,
    )
    .join("");
  const evts = dayEvts
    .map((e) => {
      const [eh, em] = e.time.split(":").map(Number);
      const top = (eh - 7 + em / 60) * HH;
      const bg = getEventColor(e);
      const isDarkD =
        document.documentElement.getAttribute("data-theme") === "dark";
      const evColorD = isDarkD ? "#ffffff" : "#0f172a";
      return `<div class="cal-day-event" style="top:${top}px;height:${HH}px;background:${bg};color:${evColorD};border:1px solid ${bg};" onclick="event.stopPropagation();openEdit(${e.id})"><strong>${fmtTime(e.time)}</strong> — ${e.name} (${e.position})<br><span style="font-size:10px;opacity:.85;">${e.round} · ${e.type}</span></div>`;
    })
    .join("");
  document.getElementById("cal-main-area").innerHTML =
    `<div class="cal-day-view"><div class="cal-day-view-header"><div></div><div class="cal-day-view-title">${calDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div></div><div class="cal-day-body"><div class="cal-time-col">${timeCol}</div><div style="position:relative;">${blocks}${evts}</div></div></div>`;
}

function renderAgenda() {
  const today = todayStr();
  const evts = getFiltered()
    .filter((e) => e.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));
  document.getElementById("cal-today-label").textContent =
    new Date().toLocaleDateString("en-PH", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  const el = document.getElementById("cal-today-agenda");
  if (!evts.length) {
    el.innerHTML = `<div style="text-align:center;padding:20px 0;color:var(--light);font-size:13px;">No interviews today.</div>`;
    return;
  }
  el.innerHTML = evts
    .map((e) => {
      const bg = getEventColor(e);
      return `<div class="agenda-item" style="border-left-color:${bg};" onclick="openEdit(${e.id})"><div class="agenda-time">${fmtTime(e.time)}</div><div class="agenda-body"><div class="agenda-name">${sanitize(e.name)}</div><div class="agenda-meta">${sanitize(e.position)} · ${sanitize(e.round)}</div><div class="agenda-meta" style="margin-top:2px;">${e.type === "Virtual" ? "📹" : "🏢"} ${e.type} · <span style="color:${bg};font-weight:600;">${e.status}</span></div></div></div>`;
    })
    .join("");
}

function renderCalendar() {
  if (calView === "month") renderMonth();
  else if (calView === "week") renderWeek();
  else renderDay();
  renderAgenda();
  renderCalendarSidebar();
  renderCalendarLegend();
}

/* ──────────────────────────────────────────────
   SIDEBAR CALENDAR LIST
   Shows each calendar with a color swatch, name,
   event count, and an eye-toggle to show/hide it
────────────────────────────────────────────── */
function renderCalendarSidebar() {
  const el = document.getElementById("cal-sidebar-list");
  if (!el) return;

  const rows = UPSTAFF_CALENDARS.map((cal) => {
    const count = calEvents.filter(
      (e) => (e.calendarId || e.sourceCalendar || "primary") === cal.calendarId,
    ).length;
    const hidden = hiddenCalendars.has(cal.calendarId);
    const opacity = hidden ? "0.4" : "1";
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:9px;margin-bottom:2px;cursor:pointer;transition:background .12s;background:${hidden ? "transparent" : "var(--row-hover)"};"
      onmouseenter="this.style.background='var(--surface-4)'"
      onmouseleave="this.style.background='${hidden ? "transparent" : "var(--row-hover)"}'">
      <!-- visibility toggle -->
      <button onclick="toggleCalendarVisibility('${cal.calendarId}')" title="${hidden ? "Show" : "Hide"} ${cal.calendarName}"
        style="all:unset;cursor:pointer;display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:5px;border:2px solid ${cal.color};background:${hidden ? "transparent" : cal.color};flex-shrink:0;transition:all .15s;">
        ${hidden ? "" : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`}
      </button>
      <!-- icon + name -->
      <span style="font-size:14px;line-height:1;opacity:${opacity};">${cal.icon}</span>
      <div style="flex:1;min-width:0;opacity:${opacity};">
        <div style="font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cal.calendarName}</div>
        <div style="font-size:10px;color:var(--muted);font-family:'Montserrat',sans-serif;">${cal.calendarType} · ${count} event${count !== 1 ? "s" : ""}</div>
      </div>
    </div>`;
  }).join("");

  el.innerHTML =
    rows ||
    `<div style="font-size:12px;color:var(--light);padding:8px 6px;line-height:1.8;">
    No calendars yet.<br>
    <span style="opacity:.8;">Sync Google Cal or
      <a href="#" onclick="navigateToCalendarsSettings();return false;"
         style="color:var(--cyan);font-weight:600;text-decoration:none;">
        create a calendar ↗
      </a>
    </span>
  </div>`;

  // Also refresh the Settings → Calendars panel if it is visible
  renderSettingsCalendarList();
}

/* ──────────────────────────────────────────────
   SETTINGS CALENDAR LIST
   Renders the full calendar list inside Settings → Calendars,
   with type badge, color swatch, event count, and a delete button.
────────────────────────────────────────────── */
function renderSettingsCalendarList() {
  const el = document.getElementById("settings-cal-list");
  if (!el) return;

  if (!UPSTAFF_CALENDARS.length) {
    el.innerHTML = `<div style="font-size:13px;color:var(--light);padding:12px 0;text-align:center;">
      No calendars synced yet. Sign in with Google and click <strong>Sync Google Cal</strong>.
    </div>`;
    return;
  }

  const TYPE_ICONS = {
    Interview: "📅",
    Event: "📋",
    "To-Do": "✅",
    General: "🗓️",
    Holiday: "🎉",
    Primary: "🗓️",
  };

  el.innerHTML = UPSTAFF_CALENDARS.map((cal) => {
    const count = calEvents.filter(
      (e) => (e.calendarId || e.sourceCalendar) === cal.calendarId,
    ).length;
    const icon = TYPE_ICONS[cal.calendarType] || "📋";
    const isPrimary =
      cal.calendarId === "primary" || cal.calendarType === "Primary";
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;
         background:var(--surface-3);border:1px solid var(--border);">
      <!-- Color swatch -->
      <div style="width:36px;height:36px;border-radius:10px;background:${cal.color}22;
           display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;
           border:1.5px solid ${cal.color}44;">${icon}</div>
      <!-- Info -->
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${cal.calendarName}${isPrimary ? ' <span style="font-size:10px;font-weight:700;background:rgba(68,215,233,.15);color:var(--cyan);padding:1px 7px;border-radius:5px;font-family:Montserrat,sans-serif;">PRIMARY</span>' : ""}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px;display:flex;align-items:center;gap:8px;">
          <span style="display:inline-flex;align-items:center;gap:4px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${cal.color};flex-shrink:0;display:inline-block;"></span>
            ${cal.calendarType}
          </span>
          <span>·</span>
          <span>${count} event${count !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span style="font-family:monospace;font-size:10px;opacity:.6;overflow:hidden;text-overflow:ellipsis;max-width:180px;">${cal.calendarId}</span>
        </div>
      </div>
      <!-- Actions -->
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button onclick="toggleCalendarVisibility('${cal.calendarId}')"
          title="${hiddenCalendars.has(cal.calendarId) ? "Show" : "Hide"} in calendar"
          style="all:unset;cursor:pointer;padding:5px 10px;border-radius:8px;font-size:11px;font-weight:700;
                 font-family:'Montserrat',sans-serif;border:1.5px solid var(--border);
                 background:var(--surface-1);color:var(--muted);transition:all .15s;"
          onmouseover="this.style.borderColor='var(--cyan)';this.style.color='var(--cyan)'"
          onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">
          ${hiddenCalendars.has(cal.calendarId) ? "👁 Show" : "🚫 Hide"}
        </button>
        ${
          !isPrimary
            ? `
        <button onclick="handleDeleteCalendar('${cal.calendarId}', '${cal.calendarName.replace(/'/g, "\'")}', this)"
          title="Delete this calendar from Google"
          style="all:unset;cursor:pointer;padding:5px 10px;border-radius:8px;font-size:11px;font-weight:700;
                 font-family:'Montserrat',sans-serif;border:1.5px solid #fca5a5;
                 background:rgba(220,38,38,.06);color:#dc2626;transition:all .15s;"
          onmouseover="this.style.background='rgba(220,38,38,.14)'"
          onmouseout="this.style.background='rgba(220,38,38,.06)'">
          🗑 Delete
        </button>`
            : ""
        }
      </div>
    </div>`;
  }).join("");
}

/* ── Toggle calendar visibility ── */
function toggleCalendarVisibility(calendarId) {
  if (hiddenCalendars.has(calendarId)) {
    hiddenCalendars.delete(calendarId);
  } else {
    hiddenCalendars.add(calendarId);
  }
  renderCalendar();
}

/* ──────────────────────────────────────────────
   CALENDAR LEGEND (toolbar row)
   Renders per-calendar color dots
────────────────────────────────────────────── */
function renderCalendarLegend() {
  const el = document.getElementById("cal-legend-dynamic");
  if (!el) return;
  el.innerHTML =
    `<span style="font-size:11px;font-weight:700;color:var(--muted);font-family:'Montserrat',sans-serif;">Calendars:</span>` +
    UPSTAFF_CALENDARS.map((cal) => {
      const hidden = hiddenCalendars.has(cal.calendarId);
      return `<div class="cal-legend-item" onclick="toggleCalendarVisibility('${cal.calendarId}')" title="${hidden ? "Show" : "Hide"} ${cal.calendarName}" style="cursor:pointer;opacity:${hidden ? 0.4 : 1};transition:opacity .15s;">
        <div class="cal-legend-dot" style="background:${cal.color};${hidden ? "border:2px solid var(--border);background:transparent;" : ""};"></div>
        ${cal.calendarName}
      </div>`;
    }).join("");
}

/* ──────────────────────────────────────────────
   POPULATE CALENDAR SELECTORS
   Called on DOMContentLoaded + after UPSTAFF_CALENDARS changes
────────────────────────────────────────────── */
function populateCalendarSelectors() {
  // ── Modal calendar picker ──
  const modalSel = document.getElementById("cal-f-calendar");
  if (modalSel) {
    modalSel.innerHTML = UPSTAFF_CALENDARS.length
      ? UPSTAFF_CALENDARS.map(
          (cal) =>
            `<option value="${cal.calendarId}">${cal.icon} ${cal.calendarName} (${cal.calendarType})</option>`,
        ).join("")
      : `<option value="">— Click Sync Google Cal to load calendars —</option>`;
  }
  // ── Filter dropdown ──
  const filterSel = document.getElementById("cal-filter-calendar");
  if (filterSel) {
    filterSel.innerHTML =
      `<option value="">All Calendars</option>` +
      UPSTAFF_CALENDARS.map(
        (cal) =>
          `<option value="${cal.calendarId}">${cal.icon} ${cal.calendarName}</option>`,
      ).join("");
    filterSel.onchange = renderCalendar;
  }
  updateCalSelectorDot();
}

/* ── Update color dot next to calendar label in modal ── */
function updateCalSelectorDot() {
  const sel = document.getElementById("cal-f-calendar");
  const dot = document.getElementById("cal-selector-color-dot");
  const meta = document.getElementById("cal-selector-meta");
  if (!sel || !dot) return;
  const cal = getCalConfig(sel.value);
  if (cal) {
    dot.style.background = cal.color;
    if (meta)
      meta.textContent = `${cal.calendarType} · ID: ${cal.calendarId.length > 30 ? cal.calendarId.slice(0, 28) + "…" : cal.calendarId}`;
  }
}

/* Calendar cell / slot click helpers */
function calCellClick(ds) {
  openNewAt(ds, "09:00");
}
function openNewAt(ds, ts, taskContext) {
  calEditId = null;
  document.getElementById("cal-modal-heading").textContent =
    "Schedule Interview";
  // Default to primary calendar or first in list
  const calSel = document.getElementById("cal-f-calendar");
  if (calSel && UPSTAFF_CALENDARS.length) {
    const prim =
      UPSTAFF_CALENDARS.find((c) => c.calendarId === "primary") ||
      UPSTAFF_CALENDARS[0];
    calSel.value = prim.calendarId;
  }
  updateCalSelectorDot();

  // Auto-fill from task context if provided
  const t =
    taskContext ||
    (window._editingTaskId
      ? TASKS.find((x) => x.id === window._editingTaskId)
      : null);
  document.getElementById("cal-f-name").value = t
    ? t.applicant_name || t.name || ""
    : "";
  document.getElementById("cal-f-position").value = t
    ? t.position || "Intake Caller"
    : "Intake Caller";
  document.getElementById("cal-f-interviewer").value = t
    ? t.assignee || "HR Team"
    : "HR Team";

  // Auto-select stage from task status
  const stageMap = {
    Interview: "Initial Interview",
    Screening: "HR Round",
    Assessment: "Knowledge Assessment",
    Review: "Final Interview",
  };
  const autoRound =
    t && stageMap[t.status] ? stageMap[t.status] : "Initial Interview";
  document.getElementById("cal-f-round").value = autoRound;

  document.getElementById("cal-f-date").value = ds || fmtDate(calDate);
  document.getElementById("cal-f-time").value = ts || "09:00";
  document.getElementById("cal-f-end-time").value = autoEndTime(ts || "09:00");
  document.getElementById("cal-f-type").value = "Virtual";
  document.getElementById("cal-f-status").value = "Scheduled";
  document.getElementById("cal-f-meeting-link").value = "";
  document.getElementById("meeting-link-preview").style.display = "none";
  document.getElementById("meeting-link-note").textContent =
    "💡 Choose a platform above, generate a placeholder, or paste your own link.";
  // Reset platform selector to Google Meet
  _meetingPlatform = "meet";
  document
    .querySelectorAll(".meeting-platform-btn")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.platform === "meet"),
    );
  document.getElementById("btn-gen-link").style.display = "";
  document.getElementById("btn-open-link").style.display = "";
  document.getElementById("cal-f-meeting-link").placeholder =
    "https://meet.google.com/xxx-xxxx-xxx";
  document.getElementById("cal-f-notes").value = "";
  document.getElementById("cal-f-notify").checked = true;
  document.getElementById("cal-btn-delete").style.display = "none";
  document.getElementById("cal-modal-overlay").classList.add("open");
}
function openEdit(id) {
  const e = calEvents.find((x) => x.id === id);
  if (!e) return;
  calEditId = id;
  document.getElementById("cal-modal-heading").textContent = "Edit Interview";
  // ── Append Google Calendar badge for synced events ──
  setTimeout(() => {
    if (e.isGoogleEvent) {
      const heading = document.getElementById("cal-modal-heading");
      if (heading && !heading.querySelector(".gcal-badge")) {
        const badge = document.createElement("span");
        badge.className = "gcal-badge";
        badge.style.cssText =
          'font-size:10px;font-weight:700;background:rgba(66,133,244,.12);color:#4285F4;border:1px solid rgba(66,133,244,.25);border-radius:6px;padding:2px 8px;margin-left:8px;font-family:"Montserrat",sans-serif;';
        badge.textContent = getCalName(e.calendarId || e.sourceCalendar);
        heading.appendChild(badge);
      }
    }
  }, 0);
  // Restore calendar selector
  const calSel = document.getElementById("cal-f-calendar");
  if (calSel) {
    const savedCal =
      e.calendarId ||
      e.sourceCalendar ||
      (
        UPSTAFF_CALENDARS.find((c) => c.calendarId === "primary") ||
        UPSTAFF_CALENDARS[0]
      )?.calendarId ||
      "primary";
    calSel.value = savedCal;
    updateCalSelectorDot();
  }
  document.getElementById("cal-f-name").value = e.name;
  document.getElementById("cal-f-position").value = e.position;
  document.getElementById("cal-f-date").value = e.date;
  document.getElementById("cal-f-time").value =
    e.time || e.start_time || "09:00";
  document.getElementById("cal-f-end-time").value =
    e.end_time || autoEndTime(e.time || "09:00");
  document.getElementById("cal-f-type").value = e.type;
  document.getElementById("cal-f-round").value =
    e.round || e.interview_stage || "Initial Interview";
  document.getElementById("cal-f-status").value = e.status;
  document.getElementById("cal-f-interviewer").value = e.interviewer || "";
  const ml = e.meetingLink || e.meeting_link || "";
  document.getElementById("cal-f-meeting-link").value = ml;
  if (ml) {
    const anchor = document.getElementById("meeting-link-anchor");
    anchor.href = ml;
    anchor.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.914L15 14"/><rect x="1" y="6" width="15" height="12" rx="2"/></svg> ${ml.includes("zoom") ? "Join Zoom Meeting" : ml.includes("meet.google") ? "Join Google Meet" : "Join Meeting"}`;
    document.getElementById("meeting-link-preview").style.display = "block";
    // Auto-detect platform and set selector
    const detectedPlatform = ml.includes("zoom.us")
      ? "zoom"
      : ml.includes("meet.google")
        ? "meet"
        : "custom";
    _meetingPlatform = detectedPlatform;
    document
      .querySelectorAll(".meeting-platform-btn")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.platform === detectedPlatform),
      );
  } else {
    document.getElementById("meeting-link-preview").style.display = "none";
    _meetingPlatform = "meet";
    document
      .querySelectorAll(".meeting-platform-btn")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.platform === "meet"),
      );
  }
  document.getElementById("meeting-link-note") && updateMeetingLinkNote(ml);
  document.getElementById("cal-f-notes").value = e.notes || "";
  document.getElementById("cal-f-notify").checked = false;
  document.getElementById("cal-btn-delete").style.display = "inline-flex";
  document.getElementById("cal-modal-overlay").classList.add("open");
}

/* Auto-compute end time (1 hour after start) */
function autoEndTime(startTime) {
  if (!startTime) return "10:00";
  const [h, m] = startTime.split(":").map(Number);
  const endH = Math.min(h + 1, 23);
  return `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* Live preview meeting link as user types */
document
  .getElementById("cal-f-meeting-link")
  .addEventListener("input", function () {
    const ml = this.value.trim();
    const preview = document.getElementById("meeting-link-preview");
    const anchor = document.getElementById("meeting-link-anchor");
    if (ml && ml.startsWith("http")) {
      anchor.href = ml;
      const label = ml.includes("zoom")
        ? "Join Zoom Meeting"
        : ml.includes("meet.google")
          ? "Join Google Meet"
          : "Join Meeting";
      anchor.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.914L15 14"/><rect x="1" y="6" width="15" height="12" rx="2"/></svg> ${label}`;
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }
    updateMeetingLinkNote(ml);
  });

/* ── Meeting link platform selector ── */
let _meetingPlatform = "meet";

function setMeetingPlatform(platform, btnEl) {
  _meetingPlatform = platform;
  document
    .querySelectorAll(".meeting-platform-btn")
    .forEach((b) => b.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");
  const genBtn = document.getElementById("btn-gen-link");
  const openBtn = document.getElementById("btn-open-link");
  const input = document.getElementById("cal-f-meeting-link");
  const noteEl = document.getElementById("meeting-link-note");

  if (platform === "custom") {
    genBtn.style.display = "none";
    openBtn.style.display = "none";
    input.placeholder = "https://your-meeting-link.com/join";
    noteEl.textContent =
      "Paste any video conferencing link (Teams, Webex, Whereby, etc.)";
  } else if (platform === "zoom") {
    genBtn.textContent = "⚡ Generate Zoom link";
    genBtn.style.display = "";
    openBtn.style.display = "";
    openBtn.title = "Open zoom.us";
    input.placeholder = "https://zoom.us/j/123456789";
    noteEl.textContent =
      "💡 Click Generate to create a real Zoom meeting instantly.";
  } else {
    genBtn.textContent = "⚡ Generate Meet placeholder";
    genBtn.style.display = "";
    openBtn.style.display = "";
    openBtn.title = "Open Google Meet to create a new meeting";
    input.placeholder = "https://meet.google.com/xxx-xxxx-xxx";
    noteEl.textContent =
      "💡 Generate a placeholder link, or open Google Meet to create a real room.";
  }
}

async function generateMeetingLink() {
  const input = document.getElementById("cal-f-meeting-link");
  const preview = document.getElementById("meeting-link-preview");
  const anchor = document.getElementById("meeting-link-anchor");
  const genBtn = document.getElementById("btn-gen-link");
  let url = "";

  if (_meetingPlatform === "zoom") {
    // Real Zoom meeting via Server-to-Server OAuth
    if (genBtn) {
      genBtn.disabled = true;
      genBtn.textContent = "Creating…";
    }
    try {
      const dateVal =
        document.getElementById("cal-f-date")?.value ||
        new Date().toISOString().slice(0, 10);
      const timeVal = document.getElementById("cal-f-time")?.value || "09:00";
      const startISO = `${dateVal}T${timeVal}:00`;
      const nameVal =
        document.getElementById("cal-f-name")?.value?.trim() || "Applicant";
      const topic = `Interview – ${nameVal}`;
      url = await zoomCreateMeeting({ topic, startISO });
      showCalToast("✅ Real Zoom meeting created!");
    } catch (err) {
      console.error("[Zoom] ❌ Could not create meeting:", err);
      showCalToast("❌ Zoom meeting creation failed — check console.");
      if (genBtn) {
        genBtn.disabled = false;
        genBtn.textContent = "⚡ Generate Zoom link";
      }
      return;
    }
    if (genBtn) {
      genBtn.disabled = false;
      genBtn.textContent = "⚡ Generate Zoom link";
    }
  } else if (_meetingPlatform === "meet") {
    if (gcalSignedIn) {
      // Real Meet room will be auto-created when the event is saved to GCal
      showCalToast(
        "💡 A real Google Meet room will be created automatically when you save.",
      );
      return;
    }
    // Fallback placeholder if GCal not connected
    const rand = () => Math.random().toString(36).slice(2, 5).toLowerCase();
    url = `https://meet.google.com/${rand()}-${rand()}-${rand()}`;
    showCalToast(
      "⚡ Placeholder generated — connect Google Calendar to auto-create real rooms.",
    );
  }

  if (!url) return;
  input.value = url;
  anchor.href = url;
  anchor.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.914L15 14"/><rect x="1" y="6" width="15" height="12" rx="2"/></svg> Join Meeting`;
  preview.style.display = "block";
  updateMeetingLinkNote(url);
}

function openMeetingPlatform() {
  const url =
    _meetingPlatform === "zoom"
      ? "https://zoom.us/meeting/schedule"
      : "https://meet.google.com/new";
  window.open(url, "_blank", "noopener");
}

function updateMeetingLinkNote(url) {
  const noteEl = document.getElementById("meeting-link-note");
  if (!noteEl) return;
  if (!url) {
    noteEl.textContent = "";
    return;
  }
  if (url.includes("meet.google.com"))
    noteEl.textContent = "✅ Google Meet link detected";
  else if (url.includes("zoom.us"))
    noteEl.textContent = "✅ Zoom link detected";
  else if (url.startsWith("http")) noteEl.textContent = "✅ Custom video link";
  else noteEl.textContent = "";
}
function closeModal() {
  document.getElementById("cal-modal-overlay").classList.remove("open");
  // ── Clean up badge and meeting link preview ──
  const badge = document.querySelector(".gcal-badge");
  if (badge) badge.remove();
  const preview = document.getElementById("meeting-link-preview");
  if (preview) preview.style.display = "none";
  const mlInput = document.getElementById("cal-f-meeting-link");
  if (mlInput) mlInput.value = "";
}
document
  .getElementById("cal-modal-close-btn")
  .addEventListener("click", closeModal);
document
  .getElementById("cal-modal-cancel-btn")
  .addEventListener("click", closeModal);
document
  .getElementById("cal-modal-overlay")
  .addEventListener("click", function (e) {
    if (e.target === this) closeModal();
  });

document.getElementById("cal-btn-save").addEventListener("click", async () => {
  const name = document.getElementById("cal-f-name").value.trim();
  if (!name) {
    await uiAlert("Please enter the applicant's name.", {
      icon: "⚠️",
      title: "Name Required",
    });
    return;
  }
  const startTime = document.getElementById("cal-f-time").value;
  const endTime =
    document.getElementById("cal-f-end-time").value || autoEndTime(startTime);
  const meetingLink = document
    .getElementById("cal-f-meeting-link")
    .value.trim();
  const round = document.getElementById("cal-f-round").value;
  const shouldSync = document.getElementById("cal-f-notify").checked;
  // ── Read the selected calendar ──────────────────────────────────
  const selectedCalendarId =
    document.getElementById("cal-f-calendar")?.value ||
    UPSTAFF_CALENDARS[0]?.calendarId ||
    "primary";

  const ev = {
    id: calEditId || calNextId++,
    // ── Calendar identity ────────────────────────────────────────
    calendarId: selectedCalendarId,
    // ── Canonical event fields ───────────────────────────────────
    title: `${round} – ${name}`, // human-readable title
    applicant_name: name,
    interview_stage: round,
    start_time: startTime,
    end_time: endTime,
    meeting_link: meetingLink,
    google_event_id: calEditId
      ? calEvents.find((x) => x.id === calEditId)?.google_event_id || ""
      : "",
    // ── Legacy fields (kept for rendering compatibility) ─────────
    name,
    position: document.getElementById("cal-f-position").value,
    date: document.getElementById("cal-f-date").value,
    time: startTime,
    type: document.getElementById("cal-f-type").value,
    round,
    status: document.getElementById("cal-f-status").value,
    interviewer: document.getElementById("cal-f-interviewer").value,
    notes: document.getElementById("cal-f-notes").value,
    meetingLink,
  };

  if (calEditId) {
    const idx = calEvents.findIndex((x) => x.id === calEditId);
    if (idx > -1) calEvents[idx] = ev;
    showCalToast("✅ Interview updated!");
    persistSave();
    // Update Google Calendar if synced
    if (shouldSync && ev.google_event_id && gcalSignedIn) {
      await gcalUpdateEvent(ev).catch((err) =>
        console.warn("[GCal] Update failed:", err),
      );
    }
    // ── BI-DIRECTIONAL SYNC: push calendar status change → matching TASK ──
    syncCalEventToTask(ev);
  } else {
    calEvents.push(ev);
    showCalToast("✅ Interview scheduled!");
    persistSave();
    // Create in Google Calendar if user opted in and is signed in
    if (shouldSync && gcalSignedIn) {
      try {
        const gEventId = await gcalCreateEvent(ev);
        if (gEventId) {
          ev.google_event_id = gEventId;
          // Update the stored copy with the real google_event_id
          const stored = calEvents.find((x) => x.id === ev.id);
          if (stored) stored.google_event_id = gEventId;
          persistSave(); // re-save with google_event_id
        }
        showCalToast("☁️ Synced to Google Calendar!");
      } catch (err) {
        console.warn("[GCal] Create failed:", err);
        showCalToast("⚠️ Saved locally. Google sync failed.");
      }
    } else if (shouldSync && !gcalSignedIn) {
      showCalToast("💡 Sign into Google Calendar to sync events.");
    }
    // ── BI-DIRECTIONAL SYNC: new calendar event → create or link TASK ──
    syncCalEventToTask(ev);
  }
  closeModal();
  renderCalendar();
});

/* ══════════════════════════════════════════════
   BI-DIRECTIONAL SYNC: Calendar → Recruitment
   ══════════════════════════════════════════════
   Called whenever a calendar event is saved or
   updated. Maps the event's status to the
   matching applicant TASK and updates it.
   ────────────────────────────────────────────
   Match priority:
     1. gcalEventId on TASK matches ev.google_event_id
     2. applicant_name (case-insensitive) matches t.name
        AND ev.date matches t.due
     3. applicant_name only (loose match)
   ──────────────────────────────────────────── */
function syncCalEventToTask(ev) {
  if (!ev) return;

  // Map calendar status → recruitment stage
  const CAL_TO_TASK_STATUS = {
    Completed: "Review", // Interview done → move to Review, not auto-Hired
    Cancelled: "Cancelled",
    Rescheduled: "Screening",
    Scheduled: "Interview",
    "No Show": "Review",
  };
  const newStatus = CAL_TO_TASK_STATUS[ev.status];
  const evName = (ev.applicant_name || ev.name || "").trim().toLowerCase();

  // Find matching task
  let match = null;

  // Pass 1 — match by gcalEventId (most reliable)
  if (ev.google_event_id) {
    match = TASKS.find((t) => t.gcalEventId === ev.google_event_id);
  }

  // Pass 2 — match by name + date
  if (!match && evName) {
    match = TASKS.find(
      (t) =>
        t.name.toLowerCase().includes(evName) ||
        evName.includes(t.name.toLowerCase()),
    );
    // Tighten: if date is also available, prefer the one with matching due
    if (!match && ev.date) {
      match = TASKS.find(
        (t) =>
          t.due === ev.date &&
          (t.name.toLowerCase().includes(evName) ||
            evName.includes(t.name.toLowerCase())),
      );
    }
  }

  if (match) {
    let changed = false;

    // Sync status
    if (
      newStatus &&
      match.status !== newStatus &&
      match.status !== "Done" &&
      match.status !== "Cancelled"
    ) {
      match.status = newStatus;
      changed = true;
    }

    // Sync due date from calendar date
    if (ev.date && match.due !== ev.date) {
      match.due = ev.date;
      changed = true;
    }

    // Link gcalEventId if not already set
    if (ev.google_event_id && !match.gcalEventId) {
      match.gcalEventId = ev.google_event_id;
      changed = true;
    }

    if (changed) {
      persistSave();
      // Refresh whichever recruitment view is currently active
      const activeView =
        document.querySelector(".view-tab.active")?.dataset.view;
      if (activeView === "list") renderList();
      if (activeView === "board") renderBoard();
      if (activeView === "table") renderTable();
      showCalToast("🔄 Applicant record updated from calendar");
    }
    return;
  }

  // No match found — if we have a name, create a lightweight TASK stub so
  // the interview appears in the Recruitment pipeline automatically
  if (evName && ev.date) {
    const stub = {
      id: taskNextId++,
      name: ev.applicant_name || ev.name || "New Applicant",
      status: newStatus || "Applied",
      priority: "Medium",
      position: ev.position || "",
      assignee: ev.interviewer || "HR Team",
      due: ev.date,
      notes: `Auto-created from calendar: ${ev.round || ""} interview`,
      tags: [],
      created: new Date().toISOString(),
      gcalEventId: ev.google_event_id || null,
    };
    TASKS.push(stub);
    persistSave();
    const activeView = document.querySelector(".view-tab.active")?.dataset.view;
    if (activeView === "list") renderList();
    if (activeView === "board") renderBoard();
    showCalToast("➕ New applicant task created from calendar event");
  }
}

document
  .getElementById("cal-btn-delete")
  .addEventListener("click", async () => {
    if (!calEditId) return;
    const e = calEvents.find((x) => x.id === calEditId);
    if (
      await uiConfirm("This interview will be permanently deleted.", {
        icon: "🗑️",
        title: `Delete interview with ${e?.name}?`,
        okText: "Delete",
        okDanger: true,
      })
    ) {
      // Remove from Google Calendar first if synced — use the event's own calendarId
      if (e && e.google_event_id && gcalSignedIn) {
        await gcalDeleteEvent(
          e.google_event_id,
          e.calendarId || "primary",
        ).catch((err) => console.warn("[GCal] Delete failed:", err));
      }
      calEvents = calEvents.filter((x) => x.id !== calEditId);
      persistSave();
      closeModal();
      renderCalendar();
      showCalToast("🗑️ Interview deleted.");
    }
  });
document.getElementById("cal-prev").addEventListener("click", () => {
  if (calView === "month") calDate.setMonth(calDate.getMonth() - 1);
  else if (calView === "week") calDate.setDate(calDate.getDate() - 7);
  else calDate.setDate(calDate.getDate() - 1);
  calDate = new Date(calDate);
  renderCalendar();
});
document.getElementById("cal-next").addEventListener("click", () => {
  if (calView === "month") calDate.setMonth(calDate.getMonth() + 1);
  else if (calView === "week") calDate.setDate(calDate.getDate() + 7);
  else calDate.setDate(calDate.getDate() + 1);
  calDate = new Date(calDate);
  renderCalendar();
});
document.getElementById("cal-today").addEventListener("click", () => {
  calDate = new Date();
  renderCalendar();
});
document.querySelectorAll(".cal-view-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".cal-view-tab")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    calView = btn.dataset.calview;
    renderCalendar();
  });
});
document
  .getElementById("cal-add-btn")
  .addEventListener("click", () => openNewAt(fmtDate(calDate), "09:00"));
["cal-filter-position", "cal-filter-status", "cal-filter-type"].forEach(
  (id) => {
    document.getElementById(id).addEventListener("change", renderCalendar);
  },
);

/* ══════════════════════════════════════════════
   SETTINGS — sub-section tabs
══════════════════════════════════════════════ */
document.querySelectorAll(".settings-nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".settings-nav-item")
      .forEach((x) => x.classList.remove("active"));
    btn.classList.add("active");
    const key = btn.dataset.setting;
    document
      .querySelectorAll(".settings-panel")
      .forEach((p) => p.classList.remove("active"));
    document.getElementById("setting-" + key).classList.add("active");
    // Re-render the Calendars list every time that tab is activated
    if (key === "calendars") renderSettingsCalendarList();
  });
});

/* ──────────────────────────────────────────────
   NAVIGATE TO SETTINGS → CALENDARS TAB
   Called from the calendar sidebar "Manage" link.
────────────────────────────────────────────── */
function navigateToCalendarsSettings() {
  // Mark the Settings nav item as active in the sidebar
  document
    .querySelectorAll(".nav-item")
    .forEach((x) => x.classList.remove("active"));
  const navSettings = document.getElementById("nav-settings");
  if (navSettings) navSettings.classList.add("active");

  // Show the Settings view
  showSettings();

  // Auto-open the Calendars sub-panel
  document
    .querySelectorAll(".settings-nav-item")
    .forEach((x) => x.classList.remove("active"));
  const calTab = document.querySelector(
    '.settings-nav-item[data-setting="calendars"]',
  );
  if (calTab) calTab.classList.add("active");
  document
    .querySelectorAll(".settings-panel")
    .forEach((p) => p.classList.remove("active"));
  const calPanel = document.getElementById("setting-calendars");
  if (calPanel) calPanel.classList.add("active");

  renderSettingsCalendarList();
}

/* ── Team Members render ── */
function renderMembersList() {
  const el = document.getElementById("members-list");
  const ROLE_COLORS = {
    Administrator: "#6c63ff",
    "HR Manager": "#44d7e9",
    Recruiter: "#43e97b",
    Reviewer: "#fa8231",
    Interviewer: "#ff6584",
    Admin: "#9ca3af",
  };
  el.innerHTML = MEMBERS.map(
    (m) => `
    <div class="member-row">
      <div class="assignee-avatar" style="background:${m.color};width:36px;height:36px;font-size:12px;flex-shrink:0;">${initials(m.name)}</div>
      <div class="member-info">
        <div class="member-name">${sanitize(m.name)}</div>
        <div style="font-size:11px;color:var(--light);margin-top:1px;">${sanitize(m.email)}</div>
      </div>
      <span class="member-role-badge" style="background:${ROLE_COLORS[m.role] || "#9ca3af"}22;color:${ROLE_COLORS[m.role] || "#9ca3af"};">${sanitize(m.role)}</span>
      <div class="member-actions">
        <button class="member-action-btn" onclick="showToast('✏️ Edit coming soon!')">Edit</button>
        <button class="member-action-btn" style="color:#ef4444;border-color:#fca5a5;" onclick="showToast('⚠️ Remove coming soon!')">Remove</button>
      </div>
    </div>`,
  ).join("");
}

/* ── Positions render ── */
function renderPositionsList() {
  const el = document.getElementById("positions-list");
  el.innerHTML = POSITIONS.map(
    (p, i) => `
    <div class="member-row">
      <div style="width:32px;height:32px;border-radius:10px;background:var(--cyan-lt);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">💼</div>
      <div class="member-info"><div class="member-name">${sanitize(p)}</div><div style="font-size:11px;color:var(--light);">Active position</div></div>
      <div class="member-actions">
        <button class="member-action-btn" style="color:#ef4444;border-color:#fca5a5;" onclick="removePosition(${i})">Remove</button>
      </div>
    </div>`,
  ).join("");
}
async function removePosition(i) {
  if (
    await uiConfirm(
      `"${POSITIONS[i]}" will be removed from the positions list.`,
      {
        icon: "🗑️",
        title: "Remove Position?",
        okText: "Remove",
        okDanger: true,
      },
    )
  ) {
    POSITIONS.splice(i, 1);
    renderPositionsList();
    showToast("🗑️ Position removed.");
  }
}
document.getElementById("add-position-btn").addEventListener("click", () => {
  const name = prompt("Enter new position name:");
  if (name && name.trim()) {
    POSITIONS.push(name.trim());
    renderPositionsList();
    showToast("✅ Position added!");
  }
});

/* ── Reset demo data ── */
/* ══════════════════════════════════════════════
   DATA BACKUP — Export & Import JSON
   Lets the user download all data as a .json
   file and restore it from a previous export.
══════════════════════════════════════════════ */
function exportDataJSON() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks: TASKS,
    calEvents: calEvents.filter((e) => !e.isGoogleEvent),
    employees: EMPLOYEES,
    candidates: CANDIDATES,
    todos: TODOS,
    taskNextId,
    calNextId,
    empNextId,
    todoNextId,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `upstaff-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("✅ Data exported successfully!");
}

async function importDataJSON(input) {
  const file = input.files[0];
  if (!file) return;
  if (
    !(await uiConfirm(
      "This will overwrite all current tasks, employees, and events.",
      {
        icon: "⚠️",
        title: "Import & Overwrite?",
        okText: "Import",
        okDanger: true,
      },
    ))
  ) {
    input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.version) throw new Error("Invalid backup file");
      if (data.tasks) {
        TASKS = data.tasks;
        taskNextId = data.taskNextId || 100;
      }
      if (data.calEvents) {
        calEvents = [...data.calEvents];
        calNextId = data.calNextId || 200;
      }
      if (data.employees) {
        EMPLOYEES = data.employees;
        empNextId = data.empNextId || 1;
      }
      if (data.candidates) {
        CANDIDATES = data.candidates;
      }
      if (data.todos) {
        TODOS = data.todos;
        todoNextId = data.todoNextId || 1;
      }
      persistSave();
      empPersistSave();
      saveCandidates();
      todoSave();
      refreshCurrentView();
      showToast("✅ Data imported successfully!");
    } catch (err) {
      showToast("❌ Import failed — invalid file.");
      console.error("[Import]", err);
    }
    input.value = "";
  };
  reader.readAsText(file);
}

async function resetDemoData() {
  if (
    !(await uiConfirm(
      "All applicant data and calendar events will be permanently cleared.",
      {
        icon: "⚠️",
        title: "Reset All Data?",
        okText: "Reset Everything",
        okDanger: true,
      },
    ))
  )
    return;
  TASKS = [];
  calEvents = [];
  UPSTAFF_CALENDARS = [];
  taskNextId = 100;
  calNextId = 200;
  remindersFired.clear();
  persistClearAll();
  persistSave();
  populateCalendarSelectors();
  renderCalendar();
  refreshCurrentView();
  showToast("🔄 Tasks restored. Sync Google Calendar to reload events.");
}

/* ══════════════════════════════════════════════
   GLOBAL SEARCH
══════════════════════════════════════════════ */
let searchFocusIdx = -1;

function openGlobalSearch() {
  document.getElementById("search-modal-overlay").classList.add("open");
  const inp = document.getElementById("global-search-input");
  inp.value = "";
  searchFocusIdx = -1;
  renderSearchResults("");
  setTimeout(() => inp.focus(), 60);
}
function closeGlobalSearch() {
  document.getElementById("search-modal-overlay").classList.remove("open");
  searchFocusIdx = -1;
}

function highlightMatch(text, q) {
  if (!q) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text.replace(re, "<mark>$1</mark>");
}

function renderSearchResults(q) {
  const el = document.getElementById("search-results");
  const query = q.trim().toLowerCase();

  if (!query) {
    // Show recent / all tasks as default hint
    el.innerHTML = `<div class="search-empty">Start typing to search applicants, positions, or assignees…</div>`;
    return;
  }

  // Search tasks
  const taskHits = TASKS.filter(
    (t) =>
      t.name.toLowerCase().includes(query) ||
      t.position.toLowerCase().includes(query) ||
      t.assignee.toLowerCase().includes(query) ||
      t.status.toLowerCase().includes(query) ||
      t.priority.toLowerCase().includes(query),
  ).slice(0, 8);

  // Search calendar events
  const calHits = calEvents
    .filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.position.toLowerCase().includes(query) ||
        e.round.toLowerCase().includes(query) ||
        e.interviewer.toLowerCase().includes(query),
    )
    .slice(0, 4);

  if (!taskHits.length && !calHits.length) {
    el.innerHTML = `<div class="search-empty">No results for "<strong>${q}</strong>"</div>`;
    return;
  }

  let html = "";

  if (taskHits.length) {
    html += `<div class="search-group-label">Applicants (${taskHits.length})</div>`;
    html += taskHits
      .map((t, i) => {
        const sm = STATUS_META[t.status] || { color: "#9ca3af", bg: "#f3f4f6" };
        const pc = PRIORITY_COLORS[t.priority] || "#ccc";
        return `<div class="search-result-item" data-task-id="${t.id}" tabindex="-1">
        <div class="search-result-icon" style="background:${sm.bg};">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${sm.color}" stroke-width="2.5" stroke-linecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </div>
        <div class="search-result-body">
          <div class="search-result-title">${highlightMatch(sanitize(t.name), q)}</div>
          <div class="search-result-meta">${sanitize(t.position)} · ${sanitize(t.assignee)} · Due ${fmtDue(t.due)}</div>
        </div>
        <div class="search-result-badge">
          <span class="${statusPillClass(t.status)}" style="font-size:10px;">${t.status}</span>
        </div>
      </div>`;
      })
      .join("");
  }

  if (calHits.length) {
    html += `<div class="search-group-label">Interviews (${calHits.length})</div>`;
    html += calHits
      .map((e) => {
        const bg = STATUS_COLORS[e.status] || "#44D7E9";
        return `<div class="search-result-item" data-cal-id="${e.id}" tabindex="-1">
        <div class="search-result-icon" style="background:${bg}22;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${bg}" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div class="search-result-body">
          <div class="search-result-title">${highlightMatch(sanitize(e.name), q)}</div>
          <div class="search-result-meta">${sanitize(e.position)} · ${sanitize(e.round)} · ${fmtDue(e.date)} ${fmtTime(e.time)}</div>
        </div>
        <div class="search-result-badge">
          <span class="${calStatusPillClass(e.status)}" style="font-size:10px;">${e.status}</span>
        </div>
      </div>`;
      })
      .join("");
  }

  el.innerHTML = html;

  // Click handlers on results
  el.querySelectorAll("[data-task-id]").forEach((row) => {
    row.addEventListener("click", () => {
      closeGlobalSearch();
      // Switch to list view and open the task
      switchView("list");
      openTaskEdit(parseInt(row.dataset.taskId));
    });
  });
  el.querySelectorAll("[data-cal-id]").forEach((row) => {
    row.addEventListener("click", () => {
      closeGlobalSearch();
      switchView("calendar");
      openEdit(parseInt(row.dataset.calId));
    });
  });
}

/* Wire up button, input, keyboard, overlay-click */
document
  .getElementById("btn-global-search")
  .addEventListener("click", openGlobalSearch);
document
  .getElementById("search-esc-hint")
  .addEventListener("click", closeGlobalSearch);
document
  .getElementById("search-modal-overlay")
  .addEventListener("click", function (e) {
    if (e.target === this) closeGlobalSearch();
  });
document.getElementById("global-search-input").addEventListener(
  "input",
  debounce(function () {
    searchFocusIdx = -1;
    renderSearchResults(this.value);
  }, 200),
);

// Keyboard shortcut: Ctrl+K / Cmd+K to open; ESC to close
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    openGlobalSearch();
  }
  if (e.key === "Escape") closeGlobalSearch();

  // Arrow key navigation inside results
  if (
    document.getElementById("search-modal-overlay").classList.contains("open")
  ) {
    const items = document.querySelectorAll(".search-result-item");
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      searchFocusIdx = Math.min(searchFocusIdx + 1, items.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      searchFocusIdx = Math.max(searchFocusIdx - 1, 0);
    } else if (e.key === "Enter" && searchFocusIdx >= 0) {
      items[searchFocusIdx]?.click();
      return;
    }
    items.forEach((it, i) =>
      it.classList.toggle("focused", i === searchFocusIdx),
    );
    if (searchFocusIdx >= 0)
      items[searchFocusIdx].scrollIntoView({ block: "nearest" });
  }
});

/* ══════════════════════════════════════════════
   ANALYTICS — APPLICANT DATA & RENDER
══════════════════════════════════════════════ */

/**
 * APPLICANT_DATA — representative sample dataset.
 * Each applicant has: choice1, choice2, choice3 (position strings),
 * employmentType, workSetup, workSchedule, education, tools (array),
 * skills (array), source (where they heard about us).
 *
 * This data is stored separately from TASKS/calEvents and is read-only
 * for the analytics view — it does NOT affect any other feature.
 */
const APPLICANT_DATA = [
  {
    choice1: "Customer Service Representative",
    choice2: "Administrative Assistant",
    choice3: "Data Entry Specialist",
    employmentType: "Full-Time",
    workSetup: "Remote",
    workSchedule: "Morning",
    education: "College Graduate",
    tools: ["MS Office", "Google Workspace", "Zoom / Teams"],
    skills: ["Communication", "Customer Handling"],
    source: "Facebook",
  },
  {
    choice1: "Bookkeeper",
    choice2: "General Ledger Accountant",
    choice3: "Accountant",
    employmentType: "Full-Time",
    workSetup: "On-site",
    workSchedule: "Morning",
    education: "College Graduate",
    tools: ["QuickBooks", "Xero", "MS Office"],
    skills: ["Bookkeeping", "Accounting", "Data Entry"],
    source: "LinkedIn",
  },
  {
    choice1: "Graphic Designer",
    choice2: "Video Editor",
    choice3: "Ecommerce VA",
    employmentType: "Part-Time",
    workSetup: "Remote",
    workSchedule: "Flexible",
    education: "College Graduate",
    tools: ["Canva", "Adobe Suite", "Notion"],
    skills: ["Design", "Illustration", "Branding"],
    source: "Instagram",
  },
  {
    choice1: "Google Advertising Specialist",
    choice2: "Meta Advertising Specialist",
    choice3: "Ecommerce VA",
    employmentType: "Full-Time",
    workSetup: "Remote",
    workSchedule: "Morning",
    education: "College Graduate",
    tools: ["Google Workspace", "Canva", "ChatGPT / AI tools"],
    skills: ["Google Ads", "SEO", "Analytics"],
    source: "JobStreet",
  },
  {
    choice1: "Administrative Assistant",
    choice2: "Admin Support",
    choice3: "Data Entry Specialist",
    employmentType: "Full-Time",
    workSetup: "On-site",
    workSchedule: "Morning",
    education: "College Graduate",
    tools: ["MS Office", "Google Workspace", "Trello / Asana"],
    skills: ["Scheduling", "Filing", "Communication"],
    source: "Indeed",
  },
  {
    choice1: "Recruitment Officer",
    choice2: "Administrative Assistant",
    choice3: "Admin Support",
    employmentType: "Full-Time",
    workSetup: "Hybrid",
    workSchedule: "Morning",
    education: "College Graduate",
    tools: ["Google Workspace", "Slack", "Zoom / Teams"],
    skills: ["Sourcing", "Interviewing", "HR"],
    source: "Referral",
  },
  {
    choice1: "Ecommerce VA",
    choice2: "Admin Support",
    choice3: "Data Entry Specialist",
    employmentType: "Contractual",
    workSetup: "Remote",
    workSchedule: "Night",
    education: "College Undergraduate",
    tools: ["Shopify", "Canva", "Google Workspace"],
    skills: ["Product Listing", "Customer Service", "Research"],
    source: "Facebook",
  },
  {
    choice1: "BackEnd Web Developer",
    choice2: "Data Entry Specialist",
    choice3: "Admin Support",
    employmentType: "Full-Time",
    workSetup: "Remote",
    workSchedule: "Flexible",
    education: "College Graduate",
    tools: ["Google Workspace", "Slack", "Notion"],
    skills: ["Python", "Node.js", "MySQL"],
    source: "Company Website",
  },
  {
    choice1: "Patient Care Admin Associate",
    choice2: "Administrative Assistant",
    choice3: "Customer Service Representative",
    employmentType: "Full-Time",
    workSetup: "On-site",
    workSchedule: "Morning",
    education: "College Graduate",
    tools: ["MS Office", "Zoom / Teams", "Google Workspace"],
    skills: ["Medical Records", "Customer Service", "Data Entry"],
    source: "Walk-in",
  },
  {
    choice1: "Data Entry Specialist",
    choice2: "Administrative Assistant",
    choice3: "Admin Support",
    employmentType: "Part-Time",
    workSetup: "Remote",
    workSchedule: "Mid-shift",
    education: "Vocational / TESDA",
    tools: ["MS Office", "Google Workspace"],
    skills: ["Typing", "Data Encoding", "Accuracy"],
    source: "Facebook",
  },
  {
    choice1: "Meta Advertising Specialist",
    choice2: "Google Advertising Specialist",
    choice3: "Graphic Designer",
    employmentType: "Full-Time",
    workSetup: "Remote",
    workSchedule: "Morning",
    education: "College Graduate",
    tools: ["Canva", "Adobe Suite", "ChatGPT / AI tools"],
    skills: ["Meta Ads", "Copywriting", "Analytics"],
    source: "LinkedIn",
  },
  {
    choice1: "Accountant",
    choice2: "Bookkeeper",
    choice3: "General Ledger Accountant",
    employmentType: "Full-Time",
    workSetup: "On-site",
    workSchedule: "Morning",
    education: "Post Graduate",
    tools: ["QuickBooks", "Xero", "MS Office"],
    skills: ["Audit", "Tax", "Financial Reporting"],
    source: "JobStreet",
  },
  {
    choice1: "Video Editor",
    choice2: "Graphic Designer",
    choice3: "Ecommerce VA",
    employmentType: "Project-Based",
    workSetup: "Remote",
    workSchedule: "Flexible",
    education: "College Undergraduate",
    tools: ["Adobe Suite", "Canva", "Notion"],
    skills: ["Video Editing", "Color Grading", "Motion Graphics"],
    source: "Instagram",
  },
  {
    choice1: "Admin Support",
    choice2: "Data Entry Specialist",
    choice3: "Customer Service Representative",
    employmentType: "Part-Time",
    workSetup: "Hybrid",
    workSchedule: "Weekends Only",
    education: "High School Graduate",
    tools: ["MS Office", "Google Workspace"],
    skills: ["Filing", "Communication", "Multitasking"],
    source: "Referral",
  },
  {
    choice1: "General Ledger Accountant",
    choice2: "Accountant",
    choice3: "Bookkeeper",
    employmentType: "Full-Time",
    workSetup: "On-site",
    workSchedule: "Morning",
    education: "Post Graduate",
    tools: ["Xero", "QuickBooks", "MS Office"],
    skills: ["GL Reconciliation", "Financial Statements", "Tax Compliance"],
    source: "Indeed",
  },
  {
    choice1: "Customer Service Representative",
    choice2: "Patient Care Admin Associate",
    choice3: "Admin Support",
    employmentType: "Full-Time",
    workSetup: "On-site",
    workSchedule: "Night",
    education: "College Graduate",
    tools: ["Zoom / Teams", "Google Workspace", "Slack"],
    skills: ["Active Listening", "Problem Solving", "CRM"],
    source: "Facebook",
  },
  {
    choice1: "Graphic Designer",
    choice2: "Video Editor",
    choice3: "Meta Advertising Specialist",
    employmentType: "Contractual",
    workSetup: "Remote",
    workSchedule: "Flexible",
    education: "College Graduate",
    tools: ["Adobe Suite", "Canva", "Figma"],
    skills: ["Logo Design", "Social Media Graphics", "UI Design"],
    source: "Company Website",
  },
  {
    choice1: "Recruitment Officer",
    choice2: "Admin Support",
    choice3: "Administrative Assistant",
    employmentType: "Full-Time",
    workSetup: "Hybrid",
    workSchedule: "Morning",
    education: "College Graduate",
    tools: ["Google Workspace", "Trello / Asana", "Zoom / Teams"],
    skills: ["Talent Acquisition", "Onboarding", "HR Compliance"],
    source: "LinkedIn",
  },
  {
    choice1: "Ecommerce VA",
    choice2: "Data Entry Specialist",
    choice3: "Administrative Assistant",
    employmentType: "Part-Time",
    workSetup: "Remote",
    workSchedule: "Mid-shift",
    education: "College Undergraduate",
    tools: ["Shopify", "Google Workspace", "Canva"],
    skills: ["Order Processing", "Inventory", "Customer Support"],
    source: "Facebook",
  },
  {
    choice1: "BackEnd Web Developer",
    choice2: "Admin Support",
    choice3: "Ecommerce VA",
    employmentType: "Full-Time",
    workSetup: "Remote",
    workSchedule: "Night",
    education: "College Graduate",
    tools: ["Slack", "Notion", "Google Workspace"],
    skills: ["REST APIs", "PHP", "Laravel"],
    source: "Indeed",
  },
];

/* ── Colour palette for charts ── */
const CHART_COLORS = [
  "#44d7e9",
  "#6c63ff",
  "#fa8231",
  "#43e97b",
  "#ff6584",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
  "#06b6d4",
];

/* ── Utility: count occurrences in an array of values ── */
function countBy(arr) {
  return arr.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}

/* ── Build an SVG donut chart and legend ── */
function buildDonut(container, data, colors) {
  // data = [{label, value}, ...]
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    container.innerHTML =
      '<div style="color:var(--light);font-size:13px;">No data</div>';
    return;
  }

  const R = 54,
    r = 34,
    cx = 60,
    cy = 60;
  let angle = -Math.PI / 2; // start at top
  const slices = data.map((d, i) => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(angle);
    const y1 = cy + R * Math.sin(angle);
    angle += sweep;
    const x2 = cx + R * Math.cos(angle);
    const y2 = cy + R * Math.sin(angle);
    const ix1 = cx + r * Math.cos(angle);
    const iy1 = cy + r * Math.sin(angle);
    angle -= sweep;
    const ix2 = cx + r * Math.cos(angle);
    const iy2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const path = `M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} L${ix1.toFixed(2)},${iy1.toFixed(2)} A${r},${r} 0 ${large},0 ${ix2.toFixed(2)},${iy2.toFixed(2)} Z`;
    angle += sweep;
    return {
      path,
      color: colors[i % colors.length],
      label: d.label,
      value: d.value,
    };
  });

  const svg = `<svg width="120" height="120" viewBox="0 0 120 120" style="flex-shrink:0;">
    ${slices.map((s) => `<path d="${s.path}" fill="${s.color}" opacity=".9"/>`).join("")}
    <text x="${cx}" y="${cy + 2}" text-anchor="middle" font-size="13" font-weight="800" font-family="Syne,sans-serif" fill="currentColor" style="fill:var(--text);">${total}</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="8" font-weight="600" font-family="Montserrat,sans-serif" fill="currentColor" style="fill:var(--light);">TOTAL</text>
  </svg>`;

  const legend = `<div class="donut-legend">${slices
    .map(
      (s) =>
        `<div class="donut-legend-item">
      <div class="donut-legend-dot" style="background:${s.color};"></div>
      <span class="donut-legend-label">${s.label}</span>
      <span class="donut-legend-val">${s.value} <span style="opacity:.5;">(${Math.round((s.value / total) * 100)}%)</span></span>
    </div>`,
    )
    .join("")}</div>`;

  container.innerHTML = svg + legend;
}

/* ── Build a horizontal bar chart ── */
function buildBarChart(container, data, color) {
  // data = [{label, value}, ...] — already sorted descending
  const max = Math.max(...data.map((d) => d.value), 1);
  container.innerHTML = data
    .map(
      (d, i) => `
    <div class="bar-row">
      <div class="bar-label">${d.label}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${((d.value / max) * 100).toFixed(1)}%;background:${Array.isArray(color) ? color[i % color.length] : color};"></div>
      </div>
      <div class="bar-count">${d.value}</div>
    </div>`,
    )
    .join("");
}

/* ── Build tag cloud ── */
function buildTagCloud(container, data) {
  // data = [{label, value}, ...] sorted desc
  // All chips use the same neutral style; hover reveals cyan accent
  container.innerHTML = data
    .map(
      (d) =>
        `<div class="tag-chip">${d.label}<span class="tag-chip-count">${d.value}</span></div>`,
    )
    .join("");
}

/* ── Build source list ── */
function buildSourceList(container, data) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const icons = {
    Facebook: "👍",
    LinkedIn: "💼",
    Instagram: "📸",
    JobStreet: "🔎",
    Indeed: "🔍",
    Referral: "🤝",
    "Company Website": "🌐",
    "Walk-in": "🚶",
    Other: "❓",
  };
  container.innerHTML = data
    .map((d) => {
      const pct = total ? Math.round((d.value / total) * 100) : 0;
      return `<div class="source-row">
      <div class="source-icon">${icons[d.label] || "❓"}</div>
      <div class="source-label">${d.label}</div>
      <div class="source-bar-track"><div class="source-bar-fill" style="width:${pct}%;"></div></div>
      <div class="source-pct">${pct}%</div>
      <div style="font-size:11px;color:var(--muted);min-width:20px;text-align:right;font-family:'Montserrat',sans-serif;font-weight:700;">${d.value}</div>
    </div>`;
    })
    .join("");
}

/* ── Main render function for the Analytics view ── */
function renderAnalytics() {
  const A = APPLICANT_DATA; // shorthand
  const total = A.length;

  /* ── 1. KPI cards ── */
  const totalInterviews = calEvents.length;
  const hiredCount = calEvents.filter((e) => e.status === "Completed").length;
  const uniquePositions = [...new Set(A.map((a) => a.choice1))].length;

  document.getElementById("analytics-kpi-row").innerHTML = `
    <div class="analytics-stat-card">
      <div class="analytics-stat-icon" style="background:rgba(68,215,233,.12);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#44d7e9" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
      </div>
      <div class="analytics-stat-value">${total}</div>
      <div class="analytics-stat-label">Total Applicants</div>
      <div class="analytics-stat-sub">In current dataset</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-icon" style="background:rgba(67,233,123,.12);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#43e97b" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
      </div>
      <div class="analytics-stat-value">${totalInterviews}</div>
      <div class="analytics-stat-label">Interviews Scheduled</div>
      <div class="analytics-stat-sub">From calendar data</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-icon" style="background:rgba(108,99,255,.12);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="analytics-stat-value">${hiredCount}</div>
      <div class="analytics-stat-label">Completed Interviews</div>
      <div class="analytics-stat-sub">Status: Completed</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-icon" style="background:rgba(250,130,49,.12);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fa8231" stroke-width="2.5" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      </div>
      <div class="analytics-stat-value">${uniquePositions}</div>
      <div class="analytics-stat-label">Positions Applied</div>
      <div class="analytics-stat-sub">Unique 1st-choice roles</div>
    </div>`;

  /* ── 2. Position choice summary table ── */
  const ALL_POSITIONS = JOB_POSITIONS;
  const c1 = countBy(A.map((a) => a.choice1));
  const c2 = countBy(A.map((a) => a.choice2));
  const c3 = countBy(A.map((a) => a.choice3));

  const tableRows = ALL_POSITIONS.map((p) => {
    const v1 = c1[p] || 0,
      v2 = c2[p] || 0,
      v3 = c3[p] || 0,
      tot = v1 + v2 + v3;
    if (tot === 0) return ""; // hide positions with zero applicants
    return `<tr>
      <td style="font-weight:600;">${p}</td>
      <td>${v1 > 0 ? `<span class="choice-badge" style="background:rgba(68,215,233,.15);color:#44d7e9;">${v1}</span>` : '<span style="color:var(--light);">—</span>'}</td>
      <td>${v2 > 0 ? `<span class="choice-badge" style="background:rgba(108,99,255,.15);color:#7c75ff;">${v2}</span>` : '<span style="color:var(--light);">—</span>'}</td>
      <td>${v3 > 0 ? `<span class="choice-badge" style="background:rgba(250,130,49,.15);color:#fa8231;">${v3}</span>` : '<span style="color:var(--light);">—</span>'}</td>
      <td><strong>${tot}</strong></td>
    </tr>`;
  }).join("");

  document.getElementById("position-choice-table").innerHTML = `
    <thead><tr>
      <th>Position</th>
      <th>1st Choice</th>
      <th>2nd Choice</th>
      <th>3rd Choice</th>
      <th>Total Interest</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>`;

  /* ── 3. Applicants per position (1st choice bar chart) ── */
  const posData = Object.entries(c1)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  buildBarChart(
    document.getElementById("chart-position"),
    posData,
    CHART_COLORS,
  );

  /* ── 4. Employment type donut ── */
  const empCount = countBy(A.map((a) => a.employmentType));
  const empData = ["Full-Time", "Part-Time", "Contractual", "Project-Based"]
    .map((l, i) => ({ label: l, value: empCount[l] || 0 }))
    .filter((d) => d.value > 0);
  buildDonut(document.getElementById("chart-employment"), empData, [
    "#44d7e9",
    "#6c63ff",
    "#fa8231",
    "#43e97b",
  ]);

  /* ── 5. Work setup donut ── */
  const setupCount = countBy(A.map((a) => a.workSetup));
  const setupData = ["On-site", "Remote", "Hybrid"]
    .map((l) => ({ label: l, value: setupCount[l] || 0 }))
    .filter((d) => d.value > 0);
  buildDonut(document.getElementById("chart-setup"), setupData, [
    "#fa8231",
    "#44d7e9",
    "#6c63ff",
  ]);

  /* ── 6. Work schedule bar chart ── */
  const schedCount = countBy(A.map((a) => a.workSchedule));
  const schedData = [
    "Morning",
    "Mid-shift",
    "Night",
    "Weekends Only",
    "Flexible",
  ]
    .map((l) => ({ label: l, value: schedCount[l] || 0 }))
    .filter((d) => d.value > 0);
  buildBarChart(
    document.getElementById("chart-schedule"),
    schedData,
    "#6c63ff",
  );

  /* ── 7. Education level bar chart ── */
  const eduCount = countBy(A.map((a) => a.education));
  const eduData = [
    "High School Graduate",
    "Vocational / TESDA",
    "College Undergraduate",
    "College Graduate",
    "Post Graduate",
  ]
    .map((l) => ({ label: l, value: eduCount[l] || 0 }))
    .filter((d) => d.value > 0);
  buildBarChart(document.getElementById("chart-education"), eduData, "#43e97b");

  /* ── 8. Source list ── */
  const srcCount = countBy(A.map((a) => a.source));
  const srcData = Object.entries(srcCount)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  buildSourceList(document.getElementById("chart-source"), srcData);

  /* ── 9. Tools tag cloud (aggregate all tool arrays) ── */
  const allTools = A.flatMap((a) => a.tools || []);
  const toolCount = countBy(allTools);
  const toolData = Object.entries(toolCount)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  buildTagCloud(document.getElementById("chart-tools"), toolData);

  /* ── 10. Skills tag cloud ── */
  const allSkills = A.flatMap((a) => a.skills || []);
  const skillCount = countBy(allSkills);
  const skillData = Object.entries(skillCount)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  buildTagCloud(document.getElementById("chart-skills"), skillData);
}

/* ── Analytics CSV Export ── */
function exportAnalyticsCSV() {
  const A = APPLICANT_DATA;
  const rows = [];

  rows.push(["UPSTAFF — Analytics Export", new Date().toLocaleString()]);
  rows.push([]);
  rows.push(["=== PIPELINE SUMMARY ==="]);
  rows.push(["Metric", "Value"]);
  rows.push(["Total Applicants", TASKS.length]);
  rows.push(["Applied", TASKS.filter((t) => t.status === "Applied").length]);
  rows.push([
    "Screening",
    TASKS.filter((t) => t.status === "Screening").length,
  ]);
  rows.push([
    "Interview",
    TASKS.filter((t) => t.status === "Interview").length,
  ]);
  rows.push([
    "Assessment",
    TASKS.filter((t) => t.status === "Assessment").length,
  ]);
  rows.push(["Review", TASKS.filter((t) => t.status === "Review").length]);
  rows.push(["Hired", TASKS.filter((t) => t.status === "Hired").length]);
  rows.push(["Rejected", TASKS.filter((t) => t.status === "Rejected").length]);
  rows.push([]);

  rows.push(["=== ASSESSMENT RESULTS ==="]);
  rows.push(["Metric", "Value"]);
  const withKnowledge = TASKS.filter((t) => t.knowledge_score);
  const passed = withKnowledge.filter(
    (t) => parseInt(t.knowledge_score) >= 75,
  ).length;
  const failed = withKnowledge.filter(
    (t) => parseInt(t.knowledge_score) < 75,
  ).length;
  const avgScore = withKnowledge.length
    ? Math.round(
        withKnowledge.reduce((s, t) => s + parseInt(t.knowledge_score), 0) /
          withKnowledge.length,
      )
    : "N/A";
  rows.push(["Assessments Taken", withKnowledge.length]);
  rows.push(["Passed (≥75%)", passed]);
  rows.push(["Failed (<75%)", failed]);
  rows.push(["Average Score", withKnowledge.length ? avgScore + "%" : "N/A"]);
  rows.push([]);

  rows.push(["=== POSITION BREAKDOWN ==="]);
  rows.push(["Position", "Total Applicants", "Hired", "Avg Knowledge Score"]);
  const positions = [...new Set(TASKS.map((t) => t.position))].sort();
  positions.forEach((pos) => {
    const group = TASKS.filter((t) => t.position === pos);
    const hired = group.filter((t) => t.status === "Hired").length;
    const scored = group.filter((t) => t.knowledge_score);
    const avg = scored.length
      ? Math.round(
          scored.reduce((s, t) => s + parseInt(t.knowledge_score), 0) /
            scored.length,
        ) + "%"
      : "—";
    rows.push([pos, group.length, hired, avg]);
  });
  rows.push([]);

  rows.push(["=== APPLICANT SOURCE BREAKDOWN ==="]);
  rows.push(["Source", "Count"]);
  const srcMap = {};
  A.forEach((a) => {
    srcMap[a.source] = (srcMap[a.source] || 0) + 1;
  });
  Object.entries(srcMap)
    .sort((a, b) => b[1] - a[1])
    .forEach(([src, cnt]) => rows.push([src, cnt]));
  rows.push([]);

  rows.push(["=== EMPLOYMENT TYPE ==="]);
  rows.push(["Type", "Count"]);
  const empMap = {};
  A.forEach((a) => {
    empMap[a.employmentType] = (empMap[a.employmentType] || 0) + 1;
  });
  Object.entries(empMap).forEach(([k, v]) => rows.push([k, v]));
  rows.push([]);

  rows.push(["=== WORK SETUP ==="]);
  rows.push(["Setup", "Count"]);
  const setupMap = {};
  A.forEach((a) => {
    setupMap[a.workSetup] = (setupMap[a.workSetup] || 0) + 1;
  });
  Object.entries(setupMap).forEach(([k, v]) => rows.push([k, v]));

  const date = new Date().toISOString().slice(0, 10);
  buildCSVDownload(rows, `upstaff-analytics-${date}.csv`);
  showToast("📊 Analytics CSV exported!");
}

/* ── Wire Analytics into showSettings / switchView pattern ── */
function showAnalytics() {
  // Hide all project view panels and settings
  PROJECT_VIEWS.forEach((id) => {
    const el = document.getElementById(
      id === "mytasks" ? "view-todos" : "view-" + id,
    );
    if (el) el.style.display = "none";
  });
  document.getElementById("view-settings").style.display = "none";
  document.getElementById("view-onboarding").style.display = "none";
  document.getElementById("view-candidates").style.display = "none";
  document.getElementById("view-analytics").style.display = "block";
  document
    .querySelectorAll(".view-tab")
    .forEach((t) => t.classList.remove("active"));

  // Hide view-bar (analytics has its own full-page layout)
  document.getElementById("view-bar").style.display = "none";

  // Update breadcrumb + buttons
  document.getElementById("crumb-parent").textContent = "upstaff";
  document.getElementById("crumb-current").textContent = "Analytics";
  document.getElementById("btn-add-task").style.display = "none";

  renderAnalytics();
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */

/* ── Dark / Light mode toggle ── */
(function () {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");
  // Restore saved preference
  if (localStorage.getItem("upstaff-theme") === "dark") {
    root.setAttribute("data-theme", "dark");
  }
  btn.addEventListener("click", () => {
    const isDark = root.getAttribute("data-theme") === "dark";
    if (isDark) {
      root.removeAttribute("data-theme");
      localStorage.setItem("upstaff-theme", "light");
    } else {
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("upstaff-theme", "dark");
    }
  });
})();

renderList(); // Default view on load
populateCalendarSelectors(); // Populate calendar dropdowns from UPSTAFF_CALENDARS
renderPositionSelects(); // Populate position dropdowns from JOB_POSITIONS

/* ══════════════════════════════════════════════
   CANDIDATES FOLDER — LOGIC
══════════════════════════════════════════════ */
let _candidateFolderFilter = "all";

function switchCandidateFolder(folder, btnEl) {
  _candidateFolderFilter = folder;
  document
    .querySelectorAll("#candidates-folder-tabs .filter-btn")
    .forEach((b) => b.classList.remove("active-folder"));
  if (btnEl) btnEl.classList.add("active-folder");
  renderCandidates();
}

function renderCandidates() {
  const search = (
    document.getElementById("candidates-search")?.value || ""
  ).toLowerCase();
  const allTasks = TASKS.filter(
    (t) => t.candidateFolder || _candidateFolderFilter === "all",
  );

  let filtered =
    _candidateFolderFilter === "all"
      ? TASKS.filter((t) => t.candidateFolder)
      : TASKS.filter((t) => t.candidateFolder === _candidateFolderFilter);

  if (search) {
    filtered = filtered.filter(
      (t) =>
        t.name.toLowerCase().includes(search) ||
        t.position.toLowerCase().includes(search) ||
        (t.assignee || "").toLowerCase().includes(search),
    );
  }

  const container = document.getElementById("candidates-list");
  if (!container) return;

  if (!filtered.length) {
    const folderLabel =
      _candidateFolderFilter === "all"
        ? "candidates"
        : `"${_candidateFolderFilter}" candidates`;
    container.innerHTML = `<div class="candidate-empty">
      <div class="candidate-empty-icon">📭</div>
      <div class="candidate-empty-title">No ${folderLabel} yet</div>
      <div style="font-size:13px;color:var(--light);margin-top:4px;">
        Open any task and assign it to a candidate folder using the <strong>Candidate Folder</strong> field.
      </div>
    </div>`;
    return;
  }

  // Group by folder when showing 'all'
  if (_candidateFolderFilter === "all") {
    const groups = {};
    CANDIDATE_FOLDERS.forEach((f) => {
      groups[f] = [];
    });
    filtered.forEach((t) => {
      if (groups[t.candidateFolder]) groups[t.candidateFolder].push(t);
    });
    let html = "";
    CANDIDATE_FOLDERS.forEach((folder) => {
      const tasks = groups[folder];
      if (!tasks.length) return;
      const folderIcons = {
        "Ready to Call": "📞",
        "Ready to Hire": "🎯",
        "Talent Pool / Shortlisted": "⭐",
      };
      const folderColors = {
        "Ready to Call": "#44d7e9",
        "Ready to Hire": "#43e97b",
        "Talent Pool / Shortlisted": "#fa8231",
      };
      html += `<div class="candidate-section-header">
        <span style="font-size:18px;">${folderIcons[folder]}</span>
        <span class="candidate-section-label">${folder}</span>
        <span class="candidate-section-count">${tasks.length}</span>
      </div>`;
      html += tasks
        .map((t) => candidateCardHTML(t, folderColors[folder]))
        .join("");
    });
    container.innerHTML = html;
  } else {
    const folderColors = {
      "Ready to Call": "#44d7e9",
      "Ready to Hire": "#43e97b",
      "Talent Pool / Shortlisted": "#fa8231",
    };
    container.innerHTML = filtered
      .map((t) => candidateCardHTML(t, folderColors[_candidateFolderFilter]))
      .join("");
  }
}

function candidateCardHTML(t, accentColor) {
  const ac = avatarColor(t.assignee);
  const dc = dueCls(t.due);
  const folderIcons = {
    "Ready to Call": "📞",
    "Ready to Hire": "🎯",
    "Talent Pool / Shortlisted": "⭐",
  };
  const folderIcon = folderIcons[t.candidateFolder] || "📁";
  return `<div class="candidate-card" onclick="openTaskEdit(${t.id})">
    <div class="candidate-avatar-lg" style="background:${ac};">${initials(t.assignee)}</div>
    <div class="candidate-info">
      <div class="candidate-name">${sanitize(t.name)}</div>
      <div class="candidate-meta">
        <span>${sanitize(t.position)}</span>
        <span>·</span>
        <span style="display:inline-flex;align-items:center;gap:4px;">
          <span class="${statusPillClass(t.status)}" style="font-size:10px;">${t.status}</span>
        </span>
        ${t.due ? `<span>·</span><span class="due-date ${dc}" style="font-size:11px;">📅 ${fmtDue(t.due)}</span>` : ""}
      </div>
    </div>
    <div class="candidate-actions">
      <span class="folder-badge" style="background:${accentColor || "#44d7e9"}20;color:${accentColor || "#44d7e9"};border:1px solid ${accentColor || "#44d7e9"}33;">
        ${folderIcon} ${t.candidateFolder}
      </span>
      <button class="candidate-folder-btn" onclick="event.stopPropagation();moveCandidateFolder(${t.id},this)">Move ▾</button>
    </div>
  </div>`;
}

function moveCandidateFolder(taskId, btnEl) {
  const t = TASKS.find((x) => x.id === taskId);
  if (!t) return;
  const folders = [...CANDIDATE_FOLDERS, "— Remove from Folders —"];
  const rect = btnEl.getBoundingClientRect();
  // Simple inline picker via a floating menu
  const existing = document.getElementById("folder-picker-popup");
  if (existing) existing.remove();
  const popup = document.createElement("div");
  popup.id = "folder-picker-popup";
  popup.style.cssText = `position:fixed;top:${rect.bottom + 4}px;left:${rect.left}px;background:var(--surface-1);border:1.5px solid var(--border);border-radius:12px;box-shadow:var(--shadow-lg);z-index:9999;padding:6px;min-width:200px;font-family:"DM Sans",sans-serif;`;
  popup.innerHTML = folders
    .map(
      (f) => `
    <div onclick="assignFolder(${taskId},'${f.includes("Remove") ? "" : f}');document.getElementById('folder-picker-popup').remove();"
      style="padding:9px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;transition:background .12s;color:${f.includes("Remove") ? "#ef4444" : "var(--text)"};"
      onmouseover="this.style.background='var(--surface-4)'" onmouseout="this.style.background=''">${f}</div>`,
    )
    .join("");
  document.body.appendChild(popup);
  setTimeout(
    () =>
      document.addEventListener("click", function _close(e) {
        if (!popup.contains(e.target)) {
          popup.remove();
          document.removeEventListener("click", _close);
        }
      }),
    50,
  );
}

function assignFolder(taskId, folder) {
  const t = TASKS.find((x) => x.id === taskId);
  if (!t) return;
  if (!folder) {
    delete t.candidateFolder;
    showToast("🗂️ Removed from candidate folders");
  } else {
    t.candidateFolder = folder;
    const icons = {
      "Ready to Call": "📞",
      "Ready to Hire": "🎯",
      "Talent Pool / Shortlisted": "⭐",
    };
    showToast(`${icons[folder] || "📁"} Moved to ${folder}`);
  }
  persistSave();
  renderCandidates();
  // Also refresh board if visible
  if (document.querySelector(".view-tab.active")?.dataset.view === "board")
    renderBoard();
}

function showCandidates() {
  document
    .querySelectorAll(".view-panel")
    .forEach((p) => (p.style.display = "none"));
  document.getElementById("view-candidates").style.display = "block";
  document.getElementById("view-bar").style.display = "none";
  document.getElementById("crumb-parent").textContent = "Recruitment";
  document.getElementById("crumb-current").textContent = "Candidates";
  document.getElementById("btn-add-task").style.display = "flex";
  document.getElementById("topbar-filter-btn").style.display = "none";
  document
    .querySelectorAll(".view-tab")
    .forEach((t) => t.classList.remove("active"));
  renderCandidates();
}

/* ── Wire candidate folder to task modal ── */
// Add candidateFolder field to task save
const _origBtnTaskSave = document.getElementById("btn-task-save");

/* ══════════════════════════════════════════════
   EXTERNAL / PUBLIC CALENDAR SUBSCRIPTION
══════════════════════════════════════════════ */
/* 3-state tracking for each public calendar:
   - active  → in _subscribedExtCalIds (subscribed, events visible)
   - unsubbed → in _unsubscribedExtCalIds (was subscribed, now hidden but saved)
   - none    → in neither list (never subscribed)
*/
let _subscribedExtCalIds = [];
let _unsubscribedExtCalIds = [];
try {
  _subscribedExtCalIds = JSON.parse(
    localStorage.getItem("upstaff_ext_cals") || "[]",
  );
  _unsubscribedExtCalIds = JSON.parse(
    localStorage.getItem("upstaff_ext_cals_unsubbed") || "[]",
  );
} catch (e) {
  console.error("[ExtCal] ❌ Corrupted calendar subscriptions, resetting:", e);
}
function _saveExtCalState() {
  localStorage.setItem(
    "upstaff_ext_cals",
    JSON.stringify(_subscribedExtCalIds),
  );
  localStorage.setItem(
    "upstaff_ext_cals_unsubbed",
    JSON.stringify(_unsubscribedExtCalIds),
  );
}

/* ── Public Calendar page tracker ── */
let _pubCalPage = 0;
const PUB_CAL_PAGE_SIZE = 5;

function renderPublicCalendars(page) {
  const el = document.getElementById("public-cal-list");
  if (!el) return;

  // Reset to page 0 on fresh renders (no argument passed)
  if (page === undefined) page = _pubCalPage;
  _pubCalPage = page;

  // Load custom calendars from storage
  let customCals = [];
  try {
    customCals = JSON.parse(
      localStorage.getItem("upstaff_custom_ext_cals") || "[]",
    );
  } catch (e) {
    console.error("[ExtCal] ❌ Corrupted custom calendars:", e);
  }
  // Filter out built-in calendars the user has deleted
  let deletedBuiltins = [];
  try {
    deletedBuiltins = JSON.parse(
      localStorage.getItem("upstaff_deleted_builtin_cals") || "[]",
    );
  } catch (e) {
    dbg("[calendarInit] Failed to parse deleted built-in cals:", e);
  }
  const visibleBuiltins = PUBLIC_CALENDARS.filter(
    (c) => !deletedBuiltins.includes(c.id),
  );
  const allCals = [...visibleBuiltins, ...customCals];

  // Pagination math
  const totalPages = Math.max(1, Math.ceil(allCals.length / PUB_CAL_PAGE_SIZE));
  if (_pubCalPage >= totalPages) _pubCalPage = totalPages - 1;
  const start = _pubCalPage * PUB_CAL_PAGE_SIZE;
  const pageCals = allCals.slice(start, start + PUB_CAL_PAGE_SIZE);

  // Sign-in banner
  const banner = gcalSignedIn
    ? `<div class="pub-cal-banner pub-cal-banner-ok">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        Google Calendar is connected. Subscribe below to add events directly to your account.
      </div>`
    : `<div class="pub-cal-banner pub-cal-banner-warn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Sign in with Google first (click <strong>Sync Google Cal</strong>) to subscribe and load events automatically.
      </div>`;

  // Build cards for current page
  const cards = pageCals
    .map((cal) => {
      const isActive = _subscribedExtCalIds.includes(cal.id);
      const isUnsubbed = _unsubscribedExtCalIds.includes(cal.id);
      const isCustom = customCals.some((c) => c.id === cal.id);

      let statusBadge = "";
      let actionBtns = "";
      const safeId = cal.id.replace(/'/g, "\\'");
      const safeName = cal.name.replace(/'/g, "\\'");

      if (isActive) {
        statusBadge = `<span class="pub-cal-status pub-cal-status-active">● Subscribed</span>`;
        actionBtns = `<button class="pub-cal-btn pub-cal-btn-unsub" onclick="unsubscribeExtCalendar('${safeId}','${safeName}',null)">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Unsubscribe</button>`;
      } else if (isUnsubbed) {
        statusBadge = `<span class="pub-cal-status pub-cal-status-unsub">○ Unsubscribed</span>`;
        actionBtns = `<button class="pub-cal-btn pub-cal-btn-resub" onclick="resubscribeExtCalendar('${safeId}','${safeName}',null)">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>
          Resubscribe</button>`;
      } else {
        statusBadge = `<span class="pub-cal-status pub-cal-status-none">— Not subscribed</span>`;
        actionBtns = `<button class="pub-cal-btn pub-cal-btn-sub" onclick="subscribeExtCalendar('${safeId}','${safeName}',null)">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Subscribe</button>`;
      }

      // Delete button — shown for ALL calendars
      const deleteBtn = `<button class="pub-cal-btn pub-cal-btn-delete" title="Delete this calendar"
        onclick="deletePublicCalEntry('${safeId}','${safeName}',${isCustom})">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        Delete</button>`;

      return `<div class="pub-cal-card ${isActive ? "pub-cal-card-active" : isUnsubbed ? "pub-cal-card-unsub" : ""}">
      <div class="pub-cal-icon">${cal.icon}</div>
      <div class="pub-cal-info">
        <div class="pub-cal-name">
          ${cal.name}
          ${isCustom ? `<span class="pub-cal-tag-custom">Custom</span>` : ""}
        </div>
        <div class="pub-cal-desc">${cal.desc || cal.id}</div>
        ${statusBadge}
      </div>
      <div class="pub-cal-actions">
        ${actionBtns}
        <button class="pub-cal-btn pub-cal-btn-copy" onclick="copyExtCalId('${safeId}',this)" title="Copy Calendar ID">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy ID</button>
        ${deleteBtn}
      </div>
    </div>`;
    })
    .join("");

  // Pagination controls
  let pagination = "";
  if (totalPages > 1) {
    const prevDisabled = _pubCalPage === 0 ? "disabled" : "";
    const nextDisabled = _pubCalPage >= totalPages - 1 ? "disabled" : "";
    const pageButtons = Array.from(
      { length: totalPages },
      (_, i) =>
        `<button class="pub-cal-page-btn ${i === _pubCalPage ? "pub-cal-page-active" : ""}"
               onclick="renderPublicCalendars(${i})">${i + 1}</button>`,
    ).join("");

    pagination = `<div class="pub-cal-pagination">
      <button class="pub-cal-page-btn pub-cal-page-nav" onclick="renderPublicCalendars(${_pubCalPage - 1})" ${prevDisabled}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      ${pageButtons}
      <button class="pub-cal-page-btn pub-cal-page-nav" onclick="renderPublicCalendars(${_pubCalPage + 1})" ${nextDisabled}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <span class="pub-cal-page-info">Showing ${start + 1}–${Math.min(start + PUB_CAL_PAGE_SIZE, allCals.length)} of ${allCals.length}</span>
    </div>`;
  }

  el.innerHTML =
    banner +
    (allCals.length
      ? cards + pagination
      : `<div class="pub-cal-empty">No public calendars defined yet. Add a custom one below.</div>`);
}

/* ── Delete a calendar entry (built-in or custom) ── */
async function deletePublicCalEntry(calId, calName, isCustom) {
  if (
    !(await uiConfirm(
      `"${calName}" will be removed and unsubscribed if active.`,
      {
        icon: "🗑️",
        title: "Remove Calendar?",
        okText: "Remove",
        okDanger: true,
      },
    ))
  )
    return;

  // Unsubscribe first if active
  if (_subscribedExtCalIds.includes(calId)) {
    _subscribedExtCalIds = _subscribedExtCalIds.filter((id) => id !== calId);
  }
  _unsubscribedExtCalIds = _unsubscribedExtCalIds.filter((id) => id !== calId);

  if (isCustom) {
    // Remove from custom list in localStorage
    try {
      let customCals = JSON.parse(
        localStorage.getItem("upstaff_custom_ext_cals") || "[]",
      );
      customCals = customCals.filter((c) => c.id !== calId);
      localStorage.setItem(
        "upstaff_custom_ext_cals",
        JSON.stringify(customCals),
      );
    } catch (e) {
      console.error("[ExtCal] delete error:", e);
    }
  } else {
    // For built-in calendars: persist a "deleted" list so they stay hidden after reload
    try {
      let deleted = JSON.parse(
        localStorage.getItem("upstaff_deleted_builtin_cals") || "[]",
      );
      if (!deleted.includes(calId)) deleted.push(calId);
      localStorage.setItem(
        "upstaff_deleted_builtin_cals",
        JSON.stringify(deleted),
      );
    } catch (e) {
      console.error("[ExtCal] delete built-in error:", e);
    }
  }

  showToast(`🗑️ "${calName}" removed.`);
  renderPublicCalendars();
}

/** Toggle subscribe/unsubscribe for a public calendar (legacy toggle, kept for back-compat) */
async function toggleExtCalendar(calendarId, calendarName, btnEl) {
  const isSubbed = _subscribedExtCalIds.includes(calendarId);
  if (isSubbed) {
    await unsubscribeExtCalendar(calendarId, calendarName, btnEl);
  } else {
    await subscribeExtCalendar(calendarId, calendarName, btnEl);
  }
}

async function unsubscribeExtCalendar(calendarId, calendarName, btnEl) {
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = "Removing…";
  }
  try {
    if (gcalSignedIn && gapi.client.calendar) {
      await gapi.client.calendar.calendarList.delete({ calendarId });
    }
    // Move from active → unsubbed (calendar is saved but hidden)
    _subscribedExtCalIds = _subscribedExtCalIds.filter(
      (id) => id !== calendarId,
    );
    if (!_unsubscribedExtCalIds.includes(calendarId))
      _unsubscribedExtCalIds.push(calendarId);
    _saveExtCalState();

    // Remove its events from the local calendar display
    calEvents = calEvents.filter(
      (e) => e.sourceCalendar !== calendarId && e.calendarId !== calendarId,
    );
    renderCalendar();
    renderPublicCalendars();
    renderSettingsCalendarList();
    showCalToast(`🔕 "${calendarName}" unsubscribed. Events hidden.`);
  } catch (err) {
    const msg = err?.result?.error?.message || err?.message || "Unknown error";
    showCalToast(`❌ Could not unsubscribe: ${msg}`);
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
    }
  }
}

async function subscribeExtCalendar(calendarId, calendarName, btnEl) {
  if (!gcalSignedIn || !gapi.client.calendar) {
    // Not signed in — save locally and copy ID for manual import
    if (!_subscribedExtCalIds.includes(calendarId)) {
      _subscribedExtCalIds.push(calendarId);
      _unsubscribedExtCalIds = _unsubscribedExtCalIds.filter(
        (id) => id !== calendarId,
      );
      _saveExtCalState();
    }
    copyExtCalId(calendarId, null);
    showCalToast(
      "📋 Calendar ID copied! Sign in with Google to auto-load events. Open Google Calendar → Other Calendars → + → Subscribe to calendar.",
    );
    renderPublicCalendars();
    return;
  }
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = "Subscribing…";
  }
  try {
    await gapi.client.calendar.calendarList.insert({
      resource: { id: calendarId },
    });
    _subscribedExtCalIds.push(calendarId);
    _unsubscribedExtCalIds = _unsubscribedExtCalIds.filter(
      (id) => id !== calendarId,
    );
    _saveExtCalState();
    showCalToast(`✅ "${calendarName}" subscribed! Loading events…`);
    // BUG FIX: re-fetch calendar list with reader access, then fetch events immediately
    await gcalFetchCalendarList();
    await gcalFetchAllCalendars();
    renderPublicCalendars();
    renderSettingsCalendarList();
  } catch (err) {
    const msg = err?.result?.error?.message || err?.message || "Unknown error";
    if (msg.toLowerCase().includes("already")) {
      // Already exists in Google Calendar — just track it and fetch
      if (!_subscribedExtCalIds.includes(calendarId))
        _subscribedExtCalIds.push(calendarId);
      _unsubscribedExtCalIds = _unsubscribedExtCalIds.filter(
        (id) => id !== calendarId,
      );
      _saveExtCalState();
      showCalToast(
        `ℹ️ "${calendarName}" was already in your Google Calendar. Loading events…`,
      );
      await gcalFetchCalendarList();
      await gcalFetchAllCalendars();
      renderPublicCalendars();
      renderSettingsCalendarList();
    } else {
      showCalToast(`❌ Could not subscribe: ${msg}`);
    }
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
    }
  }
}

/** Re-enable a previously unsubscribed public calendar */
async function resubscribeExtCalendar(calendarId, calendarName, btnEl) {
  if (!gcalSignedIn || !gapi.client.calendar) {
    // Move back to active locally, user must manually re-add in Google Calendar
    _unsubscribedExtCalIds = _unsubscribedExtCalIds.filter(
      (id) => id !== calendarId,
    );
    if (!_subscribedExtCalIds.includes(calendarId))
      _subscribedExtCalIds.push(calendarId);
    _saveExtCalState();
    copyExtCalId(calendarId, null);
    showCalToast(
      "📋 Sign in with Google to auto-reload events. Calendar ID copied for manual import.",
    );
    renderPublicCalendars();
    return;
  }
  // Same as subscribe but we know it was previously removed
  await subscribeExtCalendar(calendarId, calendarName, btnEl);
}

/** Remove a custom-added external calendar from the list entirely */
function removeCustomExtCal(calendarId) {
  let customs = [];
  try {
    customs = JSON.parse(
      localStorage.getItem("upstaff_custom_ext_cals") || "[]",
    );
  } catch (e) {
    console.error("[ExtCal] ❌ Corrupted custom cal list:", e);
    customs = [];
  }
  customs = customs.filter((c) => c.id !== calendarId);
  localStorage.setItem("upstaff_custom_ext_cals", JSON.stringify(customs));
  _subscribedExtCalIds = _subscribedExtCalIds.filter((id) => id !== calendarId);
  _unsubscribedExtCalIds = _unsubscribedExtCalIds.filter(
    (id) => id !== calendarId,
  );
  _saveExtCalState();
  renderPublicCalendars();
  showCalToast("🗑️ Custom calendar removed.");
}

async function subscribeCustomExtCalendar() {
  const idInput = document.getElementById("custom-ext-cal-id");
  const nameInput = document.getElementById("custom-ext-cal-name");
  const statusEl = document.getElementById("ext-cal-status");
  const id = idInput?.value.trim();
  const name = nameInput?.value.trim() || id;

  if (!id) {
    if (statusEl) {
      statusEl.textContent = "⚠️ Please enter a Calendar ID.";
      statusEl.style.color = "var(--orange)";
    }
    return;
  }

  // Validate it looks like a calendar ID (must contain @)
  if (!id.includes("@") && !id.includes(".")) {
    if (statusEl) {
      statusEl.textContent = "⚠️ That doesn't look like a valid Calendar ID.";
      statusEl.style.color = "var(--orange)";
    }
    return;
  }

  // Check not already in the built-in list
  const alreadyBuiltIn = PUBLIC_CALENDARS.some((c) => c.id === id);
  if (!alreadyBuiltIn) {
    // Save to custom list so it persists across sessions
    let customs = [];
    try {
      customs = JSON.parse(
        localStorage.getItem("upstaff_custom_ext_cals") || "[]",
      );
    } catch (e) {
      console.error("[ExtCal] ❌ Could not load custom cals:", e);
    }
    if (!customs.some((c) => c.id === id)) {
      customs.push({ id, name, icon: "📅", desc: id });
      localStorage.setItem("upstaff_custom_ext_cals", JSON.stringify(customs));
    }
  }

  await subscribeExtCalendar(id, name, null);

  if (statusEl) {
    statusEl.textContent = gcalSignedIn
      ? "✅ Subscribed — events loading…"
      : "📋 Calendar ID copied! Sign in to auto-load events.";
    statusEl.style.color = gcalSignedIn ? "var(--green)" : "var(--cyan)";
    setTimeout(() => {
      if (statusEl) statusEl.textContent = "";
    }, 4000);
  }
  // Clear inputs
  if (idInput) idInput.value = "";
  if (nameInput) nameInput.value = "";
}

function copyExtCalId(calendarId, btnEl) {
  navigator.clipboard?.writeText(calendarId).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = calendarId;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  });
  if (btnEl) {
    const orig = btnEl.textContent;
    btnEl.textContent = "✅ Copied!";
    setTimeout(() => {
      btnEl.textContent = orig;
    }, 2000);
  }
  showCalToast("📋 Calendar ID copied to clipboard!");
}

/* ══════════════════════════════════════════════
   GOOGLE CALENDAR API INTEGRATION
   ──────────────────────────────────────────────
   FEATURES:
   ✅ Multiple Calendar IDs supported
   ✅ Extracts Zoom/Meet links automatically
   ✅ Interview reminder notifications (10 min & 1 hour before)
   ✅ In-app notification banner + browser push notifications

   SETUP — Fill in your credentials below:
══════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   ZOOM SERVER-TO-SERVER CONFIG
   Credentials from marketplace.zoom.us → Your App → App Credentials
   ⚠️  Regenerate these after testing — do not commit to public repos
══════════════════════════════════════════════ */
const ZOOM_CONFIG = {
  ACCOUNT_ID: "uNseO7ynQ5irlTqSXH71Mg",
  CLIENT_ID: "0rjnb2o3S3DPVxCWEVRSw",
  CLIENT_SECRET: "usYvn8IqJhFDZ8lTSRs1IX2Tni1UQsC0",
  // Zoom OAuth token endpoint
  TOKEN_URL: "https://zoom.us/oauth/token",
  // Zoom API base
  API_BASE: "https://api.zoom.us/v2",
  // Default meeting duration in minutes
  DEFAULT_DURATION: 60,
  // Default timezone
  TIMEZONE: "Asia/Manila",
};

// Cache the Zoom token so we don't re-fetch on every meeting creation
let _zoomTokenCache = { token: null, expires: 0 };

/* zoomGetToken
   Fetches a Server-to-Server OAuth token from Zoom.
   Caches it until 60s before expiry to avoid redundant requests. */
async function zoomGetToken() {
  const now = Date.now();
  if (_zoomTokenCache.token && _zoomTokenCache.expires > now) {
    return _zoomTokenCache.token;
  }
  const credentials = btoa(
    `${ZOOM_CONFIG.CLIENT_ID}:${ZOOM_CONFIG.CLIENT_SECRET}`,
  );
  const resp = await fetch(
    `${ZOOM_CONFIG.TOKEN_URL}?grant_type=account_credentials&account_id=${ZOOM_CONFIG.ACCOUNT_ID}`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}` },
    },
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`[Zoom] Token fetch failed: ${err}`);
  }
  const data = await resp.json();
  _zoomTokenCache = {
    token: data.access_token,
    expires: now + (data.expires_in - 60) * 1000,
  };
  dbg("[Zoom] ✅ Token acquired, expires in", data.expires_in, "s");
  return data.access_token;
}

/* zoomCreateMeeting
   Creates a real scheduled Zoom meeting via Server-to-Server OAuth.
   Returns the join_url string on success, throws on failure. */
async function zoomCreateMeeting({
  topic,
  startISO,
  duration = ZOOM_CONFIG.DEFAULT_DURATION,
}) {
  const token = await zoomGetToken();
  const resp = await fetch(`${ZOOM_CONFIG.API_BASE}/users/me/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: topic || "Interview",
      type: 2, // scheduled meeting
      start_time: startISO, // e.g. "2026-04-01T10:00:00"
      duration,
      timezone: ZOOM_CONFIG.TIMEZONE,
      settings: {
        join_before_host: true, // interviewee can join before HR
        waiting_room: false,
        host_video: true,
        participant_video: true,
        mute_upon_entry: false,
      },
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(
      `[Zoom] Create meeting failed: ${err.message || resp.status}`,
    );
  }
  const data = await resp.json();
  dbg("[Zoom] ✅ Meeting created:", data.join_url);
  return data.join_url;
}

const GCAL_CONFIG = {
  // ─────────────────────────────────────────────────────────────────
  // STEP 1: Your API Key
  // Google Cloud Console → APIs & Services → Credentials → API Key
  // ─────────────────────────────────────────────────────────────────
  API_KEY: "AIzaSyCNxV5_0ymt6B2s1WEtSYI8586U6bcYHYI",

  // ─────────────────────────────────────────────────────────────────
  // STEP 2: Your OAuth 2.0 Client ID
  // Google Cloud Console → Credentials → OAuth 2.0 Client ID
  // Authorized origin: http://localhost:8080
  // ─────────────────────────────────────────────────────────────────
  CLIENT_ID:
    "960820536270-rsnda80hpl03rmdm1tqki2p11b01svuv.apps.googleusercontent.com",

  // Calendar IDs are discovered dynamically via gcalFetchCalendarList()
  // No hardcoding needed — calendars are fetched from the Google API.

  // How many months of events to fetch (before & after today)
  MONTHS_RANGE: 2,

  // Google API scopes — full read+write access for creating/updating/deleting events
  SCOPES: "https://www.googleapis.com/auth/calendar",

  // Google API discovery document for Calendar v3
  DISCOVERY_DOC:
    "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",

  // ─────────────────────────────────────────────────────────────────
  // REMINDER SETTINGS
  // Set how many minutes before an interview to show a notification.
  // You can add or remove values from this array.
  // Default: notify 60 minutes before AND 10 minutes before.
  // ─────────────────────────────────────────────────────────────────
  REMINDER_MINUTES: [60, 30, 10],
};

// ── Calendar registry is declared earlier and populated by gcalFetchCalendarList() ──
let gcalTokenClient = null; // Holds the OAuth token client
let gcalSignedIn = false; // True once we have a valid access token
let gcalSyncedIds = new Set(); // Track which events came from Google
let remindersFired = new Set(); // Track reminders already shown (key: eventId+minutesBefore)
let reminderTimer = null; // setInterval handle for reminder checks

/* ══════════════════════════════════════════════
   PART 1: GOOGLE CALENDAR SYNC
══════════════════════════════════════════════ */

/* ──────────────────────────────────────────────
   INIT — Initializes gapi + OAuth token client
────────────────────────────────────────────── */
function gcalInit() {
  if (
    GCAL_CONFIG.API_KEY === "YOUR_API_KEY_HERE" ||
    GCAL_CONFIG.CLIENT_ID === "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com"
  ) {
    console.warn(
      "[Google Calendar] ⚠️  Please fill in your API_KEY and CLIENT_ID in GCAL_CONFIG.",
    );
    document.getElementById("gcal-sync-btn").title =
      "Please configure your API_KEY and CLIENT_ID first";
    return;
  }

  gcalTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GCAL_CONFIG.CLIENT_ID,
    scope: GCAL_CONFIG.SCOPES,
    callback: (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        gcalSignedIn = true;
        localStorage.setItem(LS_KEYS.GCAL_AUTH, "1");
        // Step 1: wait for gapi.client.calendar to be ready (resolves instantly if already loaded)
        // Step 2: discover all user calendars → Step 3: fetch events from each
        (window._gapiReadyPromise || Promise.resolve())
          .then(() => gcalFetchCalendarList())
          .then(() => gcalFetchAllCalendars())
          .catch((err) =>
            console.warn("[GCal] ⚠️ Post-auth fetch failed:", err),
          );
      } else if (tokenResponse?.error) {
        console.warn("[GCal] Token error:", tokenResponse.error);
        gcalSignedIn = false;
        const _gcalErr = tokenResponse.error;
        if (
          _gcalErr === "popup_blocked_by_browser" ||
          _gcalErr === "popup_failed_to_open"
        ) {
          updateSyncBtnState("Sync Google Cal", false);
          showPopupBlockedBanner();
        } else if (_gcalErr === "access_denied") {
          localStorage.removeItem(LS_KEYS.GCAL_AUTH);
          updateSyncBtnState("Sync Google Cal", false);
          showCalToast("\u26a0\ufe0f Google Calendar access was denied.");
        } else if (_gcalErr !== "user_cancelled") {
          updateSyncBtnState("Sync Google Cal", false);
          showCalToast("\u26a0\ufe0f Google sign-in failed. Please try again.");
        } else {
          updateSyncBtnState("Sync Google Cal", false);
        }
      }
    },
  });

  // _gapiReadyPromise resolves once gapi.client.calendar is fully loaded.
  // The token callback awaits this instead of polling — no race condition.
  let _gapiReadyResolve;
  window._gapiReadyPromise = new Promise((res) => {
    _gapiReadyResolve = res;
  });

  gapi.load("client", async () => {
    try {
      // Step 1: init with API key only (no discoveryDocs — avoids timing issues)
      await gapi.client.init({
        apiKey: GCAL_CONFIG.API_KEY,
      });
      // Step 2: load the Calendar v3 API explicitly — this is more reliable
      await gapi.client.load(GCAL_CONFIG.DISCOVERY_DOC);
      dbg("[Google Calendar] ✅ gapi client + Calendar API ready");
      _gapiReadyResolve(); // signal that calendar API is ready

      // ── Silent re-auth on page load ─────────────────────────────────
      // If the user previously granted access, try refreshing the token
      // silently (no popup). This re-fetches Google events after a reload.
      const wasPreviouslySignedIn =
        localStorage.getItem(LS_KEYS.GCAL_AUTH) === "1";
      if (wasPreviouslySignedIn) {
        dbg("[GCal] 🔄 Attempting silent token refresh…");
        updateSyncBtnState("Reconnecting…");
        // prompt: '' = use existing session; never shows a UI popup
        gcalTokenClient.requestAccessToken({ prompt: "" });
      }
    } catch (err) {
      console.error("[GCal] ❌ gapi init error:", err);
    }
  });
}

/* -- Popup-blocked helper banner -- */
function showPopupBlockedBanner() {
  const existing = document.getElementById("gcal-popup-banner");
  if (existing) existing.remove();
  const banner = document.createElement("div");
  banner.id = "gcal-popup-banner";
  banner.style.cssText =
    'position:fixed;top:68px;left:50%;transform:translateX(-50%);z-index:9999;background:#fff8e1;border:1.5px solid #fbbf24;border-radius:14px;padding:14px 20px;box-shadow:0 6px 24px rgba(0,0,0,.15);display:flex;align-items:center;gap:14px;max-width:520px;width:calc(100% - 40px);font-family:"DM Sans",sans-serif;animation:slideUp .3s ease;';
  banner.innerHTML = `
    <div style="font-size:24px;flex-shrink:0;">&#x1F512;</div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:3px;">Popup Blocked by Browser</div>
      <div style="font-size:12px;color:#78350f;line-height:1.5;">
        Your browser blocked the Google sign-in popup. Click the <strong>blocked popup icon</strong>
        in your address bar, choose <strong>"Always allow popups"</strong> for this site, then click
        <strong>Sync Google Cal</strong> again.
      </div>
    </div>
    <button onclick="document.getElementById('gcal-popup-banner').remove()"
      style="all:unset;cursor:pointer;font-size:18px;color:#92400e;flex-shrink:0;padding:0 4px;line-height:1;">&times;</button>
  `;
  document.body.appendChild(banner);
  setTimeout(() => {
    if (banner.parentNode) banner.remove();
  }, 12000);
}

/* ── Sync button state helper ─────────────────── */
function updateSyncBtnState(label, isError = false) {
  const btn = document.getElementById("gcal-sync-btn");
  const lbl = document.getElementById("gcal-btn-label");
  if (lbl) lbl.textContent = label;
  if (btn) btn.style.borderColor = isError ? "rgba(220,38,38,.4)" : "";
}

/* ──────────────────────────────────────────────
   SYNC BUTTON CLICK HANDLER
────────────────────────────────────────────── */
function handleGCalSync() {
  if (GCAL_CONFIG.API_KEY === "YOUR_API_KEY_HERE") {
    showCalToast("⚠️ Please configure your API_KEY and CLIENT_ID first!");
    return;
  }
  if (!gcalTokenClient) {
    // gapi not ready yet — give a clear message and retry hint
    showCalToast(
      "⚠️ Google API still loading. Please wait a moment and try again.",
    );
    return;
  }
  // Dismiss any previous popup-blocked banner
  const prevBanner = document.getElementById("gcal-popup-banner");
  if (prevBanner) prevBanner.remove();

  updateSyncBtnState("Connecting…");
  if (!gcalSignedIn) {
    // Use 'select_account' so Google always shows the account picker without
    // forcing re-consent — this keeps the popup smaller and less likely to be
    // blocked. If this is the very first sign-in, Google auto-shows consent.
    gcalTokenClient.requestAccessToken({ prompt: "select_account" });
  } else {
    gcalFetchAllCalendars();
  }
}

/* ──────────────────────────────────────────────
   GOOGLE API LAYER
   All functions below talk directly to the Google Calendar API.
   They do not touch the DOM — UI updates happen in the callers.
────────────────────────────────────────────── */

/* gcalFetchCalendarList
   Fetches all calendars the signed-in user can write to.
   Stores them in UPSTAFF_CALENDARS and persists to localStorage.
   Called once after sign-in, then the list is used for all operations. */
async function gcalFetchCalendarList() {
  // Guard: calendar API must be loaded before calling
  if (!gapi?.client?.calendar) {
    console.warn(
      "[GCal] ⚠️ gcalFetchCalendarList called before gapi.client.calendar was ready — skipping.",
    );
    return UPSTAFF_CALENDARS;
  }
  try {
    // Use "reader" (not "writer" or "freeBusyReader") so that subscribed
    // public/holiday calendars — which are read-only — are included in the list.
    const resp = await gapi.client.calendar.calendarList.list({
      minAccessRole: "reader",
    });
    const items = resp.result.items || [];

    UPSTAFF_CALENDARS = items.map((cal, i) => ({
      calendarId: cal.id,
      calendarName: cal.summary || cal.id,
      calendarType: cal.primary
        ? "Primary"
        : cal.summary?.toLowerCase().includes("holiday")
          ? "Holiday"
          : cal.summary?.toLowerCase().includes("interview")
            ? "Interview"
            : cal.summary?.toLowerCase().includes("todo") ||
                cal.summary?.toLowerCase().includes("to-do")
              ? "To-Do"
              : cal.summary?.toLowerCase().includes("event")
                ? "Event"
                : "General",
      color:
        cal.backgroundColor ||
        CALENDAR_COLOR_PALETTE[i % CALENDAR_COLOR_PALETTE.length],
      icon: cal.primary
        ? "🗓️"
        : cal.summary?.toLowerCase().includes("holiday")
          ? "🎉"
          : cal.summary?.toLowerCase().includes("interview")
            ? "📅"
            : cal.summary?.toLowerCase().includes("todo") ||
                cal.summary?.toLowerCase().includes("to-do")
              ? "✅"
              : "📋",
      syncEnabled: true,
    }));

    localStorage.setItem(LS_KEYS.CALENDARS, JSON.stringify(UPSTAFF_CALENDARS));
    dbg(
      `[GCal] 📋 Discovered ${UPSTAFF_CALENDARS.length} calendar(s):`,
      UPSTAFF_CALENDARS.map((c) => c.icon + " " + c.calendarName).join(", "),
    );

    populateCalendarSelectors();
    renderCalendarSidebar();
    return UPSTAFF_CALENDARS;
  } catch (err) {
    console.warn(
      "[GCal] ⚠️ Could not fetch calendar list:",
      err?.result?.error?.message || err,
    );
    return UPSTAFF_CALENDARS;
  }
}

/* gcalCreateCalendar
   Creates a brand-new calendar in the signed-in user's Google account.
   Returns the new calendarId on success, null on failure.
   After creation, re-fetches the calendar list so the new entry appears
   in all dropdowns and the Settings panel immediately. */
async function gcalCreateCalendar(name, description, calendarType) {
  if (!gcalSignedIn || !gapi.client.calendar) {
    throw new Error("Not signed in to Google Calendar");
  }
  if (!name || !name.trim()) {
    throw new Error("Calendar name is required");
  }

  const resource = {
    summary: name.trim(),
    description: description?.trim() || "",
    timeZone: "Asia/Manila",
  };

  const resp = await gapi.client.calendar.calendars.insert({ resource });
  const newCalId = resp.result.id;

  dbg(`[GCal] ✅ Created new calendar "${name}" → ${newCalId}`);

  // Re-fetch the full calendar list so the new entry is included
  await gcalFetchCalendarList();

  // Optionally override the auto-detected type with the user's choice
  const entry = UPSTAFF_CALENDARS.find((c) => c.calendarId === newCalId);
  if (entry && calendarType) {
    entry.calendarType = calendarType;
    const typeIcons = {
      Interview: "📅",
      Event: "📋",
      "To-Do": "✅",
      General: "🗓️",
      Holiday: "🎉",
    };
    entry.icon = typeIcons[calendarType] || "📋";
    localStorage.setItem(LS_KEYS.CALENDARS, JSON.stringify(UPSTAFF_CALENDARS));
  }

  return newCalId;
}

/* handleCreateCalendar
   Reads the Settings form and calls gcalCreateCalendar().
   Shows inline status, updates dropdowns and the Settings list. */
async function handleCreateCalendar() {
  const btn = document.getElementById("create-cal-btn");
  const status = document.getElementById("create-cal-status");
  const name = document.getElementById("new-cal-name")?.value.trim();
  const type = document.getElementById("new-cal-type")?.value || "General";
  const desc = document.getElementById("new-cal-desc")?.value.trim();

  if (!name) {
    if (status) {
      status.textContent = "⚠️ Please enter a calendar name.";
      status.style.color = "var(--orange)";
    }
    return;
  }
  if (!gcalSignedIn) {
    if (status) {
      status.textContent =
        "⚠️ Sign in with Google first (click Sync Google Cal).";
      status.style.color = "var(--orange)";
    }
    return;
  }

  // Disable button while working
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Creating…";
  }
  if (status) {
    status.textContent = "";
  }

  try {
    const newCalId = await gcalCreateCalendar(name, desc, type);
    if (status) {
      status.textContent = `✅ Calendar created!`;
      status.style.color = "var(--green)";
    }
    // Clear form
    document.getElementById("new-cal-name").value = "";
    document.getElementById("new-cal-desc").value = "";

    // Refresh all calendar UI
    populateCalendarSelectors();
    renderSettingsCalendarList();
    renderCalendarSidebar();
    showCalToast(`✅ "${name}" calendar created!`);

    dbg(`[UI] New calendar added: ${name} (${type}) → ${newCalId}`);
  } catch (err) {
    const msg = err?.result?.error?.message || err?.message || "Unknown error";
    console.error("[GCal] ❌ Create calendar failed:", err);
    if (status) {
      status.textContent = `❌ Failed: ${msg}`;
      status.style.color = "var(--danger)";
    }
    showCalToast(
      "❌ Could not create calendar. Check the console for details.",
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Create Calendar`;
    }
    // Auto-clear success message after 4 s
    setTimeout(() => {
      if (status && status.textContent.startsWith("✅"))
        status.textContent = "";
    }, 4000);
  }
}

/* handleDeleteCalendar
   Deletes a calendar from Google and removes it from the local registry.
   Primary calendar cannot be deleted. */
async function handleDeleteCalendar(calendarId, calendarName, btnEl) {
  if (!gcalSignedIn) {
    showCalToast("⚠️ Sign in with Google first.");
    return;
  }
  if (calendarId === "primary") {
    showCalToast("⚠️ The primary calendar cannot be deleted.");
    return;
  }
  if (
    !(await uiConfirm(
      "This will permanently delete it from your Google account and all its events. This cannot be undone.",
      {
        icon: "⚠️",
        title: `Delete "${calendarName}"?`,
        okText: "Delete Forever",
        okDanger: true,
      },
    ))
  )
    return;

  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = "Deleting…";
  }

  try {
    await gapi.client.calendar.calendars.delete({ calendarId });
    dbg(`[GCal] ✅ Deleted calendar`);

    // Remove from local registry
    UPSTAFF_CALENDARS = UPSTAFF_CALENDARS.filter(
      (c) => c.calendarId !== calendarId,
    );
    calEvents = calEvents.filter(
      (e) => (e.calendarId || e.sourceCalendar) !== calendarId,
    );
    localStorage.setItem(LS_KEYS.CALENDARS, JSON.stringify(UPSTAFF_CALENDARS));
    persistSave();

    populateCalendarSelectors();
    renderSettingsCalendarList();
    renderCalendarSidebar();
    renderCalendar();
    showCalToast(`🗑️ "${calendarName}" deleted.`);
  } catch (err) {
    const msg = err?.result?.error?.message || err?.message || "Unknown error";
    console.error("[GCal] ❌ Delete calendar failed:", err);
    showCalToast(`❌ Could not delete: ${msg}`);
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.textContent = "🗑 Delete";
    }
  }
}

/* gcalFetchAllCalendars
   Fetches events from every calendar in UPSTAFF_CALENDARS in parallel.
   Calls gcalFetchCalendarList() first if the list is empty. */
async function gcalFetchAllCalendars() {
  try {
    updateSyncBtnState("Syncing…");

    if (UPSTAFF_CALENDARS.length === 0) {
      dbg("[GCal] Calendar list empty — fetching first…");
      await gcalFetchCalendarList();
    }
    if (UPSTAFF_CALENDARS.length === 0) {
      showCalToast("⚠️ No calendars found in your Google account.");
      updateSyncBtnState("Sync Google Cal", false);
      return;
    }

    const now = new Date();
    const start = new Date(now);
    start.setMonth(start.getMonth() - GCAL_CONFIG.MONTHS_RANGE);
    const end = new Date(now);
    end.setMonth(end.getMonth() + GCAL_CONFIG.MONTHS_RANGE);

    const calendarsToSync = UPSTAFF_CALENDARS.filter(
      (c) => c.syncEnabled !== false,
    );
    dbg(`[GCal] 🔄 Syncing ${calendarsToSync.length} calendar(s)`);

    const allResults = await Promise.all(
      calendarsToSync.map((cal) =>
        gapi.client.calendar.events
          .list({
            calendarId: cal.calendarId,
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
            showDeleted: false,
            singleEvents: true,
            maxResults: 250,
            orderBy: "startTime",
          })
          .then((res) => ({
            calendarId: cal.calendarId,
            calendarName: cal.calendarName,
            events: res.result.items || [],
          }))
          .catch((err) => {
            console.warn(
              `[GCal] ⚠️ Could not fetch "${cal.calendarName}" (${cal.calendarId}):`,
              err.result?.error?.message || err,
            );
            return {
              calendarId: cal.calendarId,
              calendarName: cal.calendarName,
              events: [],
            };
          }),
      ),
    );

    const allEvents = allResults.flatMap(({ calendarId, events }) =>
      events.map((e) => ({ ...e, _sourceCalendarId: calendarId })),
    );

    const totalCount = allEvents.length;
    dbg(
      `[GCal] ✅ Total events fetched: ${totalCount} across ${calendarsToSync.length} calendar(s)`,
    );
    allResults.forEach((r) =>
      dbg(`  └─ ${r.calendarName}: ${r.events.length} event(s)`),
    );

    gcalInjectEvents(allEvents);

    localStorage.setItem(LS_KEYS.GCAL_COUNT, String(totalCount));

    const calCount = calendarsToSync.length;
    updateSyncBtnState(`Synced (${totalCount})`);
    document.getElementById("gcal-status-badge").style.display = "flex";
    document.getElementById("gcal-status-text").textContent =
      `${totalCount} events from ${calCount} calendar${calCount > 1 ? "s" : ""}`;

    renderCalendar();
    showCalToast(
      `✅ Synced ${totalCount} events from ${calCount} calendar${calCount > 1 ? "s" : ""}!`,
    );
    startReminderChecker();
  } catch (err) {
    console.error("[GCal] ❌ Sync error:", err);
    updateSyncBtnState("Sync Failed", true);
    showCalToast(
      "❌ Could not sync Google Calendar. Check the console for details.",
    );
    gcalSignedIn = false;
    if (err?.status === 401 || err?.result?.error?.code === 401) {
      localStorage.removeItem(LS_KEYS.GCAL_AUTH);
      console.warn(
        "[GCal] Token expired — cleared auth flag. User must re-authorise.",
      );
    }
  }
}

/* ──────────────────────────────────────────────
   INJECT EVENTS — Converts Google format → local format
   Extracts title, date, time, description, meeting link
────────────────────────────────────────────── */
function gcalInjectEvents(googleEvents) {
  // Remove previously synced Google events to avoid duplicates on re-sync
  calEvents = calEvents.filter((e) => !gcalSyncedIds.has(e.id));
  gcalSyncedIds.clear();

  googleEvents.forEach((gEvent) => {
    let eventDate = "",
      eventTime = "09:00",
      isAllDay = false;

    if (gEvent.start) {
      if (gEvent.start.dateTime) {
        const dt = new Date(gEvent.start.dateTime);
        eventDate = fmtDate(dt);
        eventTime = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
      } else if (gEvent.start.date) {
        eventDate = gEvent.start.date;
        isAllDay = true;
      }
    }
    if (!eventDate) return;

    // Extract Zoom / Meet / Teams links
    let meetingLink = "";
    const searchText =
      (gEvent.description || "") + " " + (gEvent.location || "");
    const zoomMatch = searchText.match(
      /https?:\/\/[a-z0-9.]*zoom\.us\/[^\s"<>]+/i,
    );
    const meetMatch = searchText.match(
      /https?:\/\/meet\.google\.com\/[^\s"<>]+/i,
    );
    const teamsMatch = searchText.match(
      /https?:\/\/teams\.microsoft\.com\/[^\s"<>]+/i,
    );
    const genericMatch = searchText.match(
      /https?:\/\/[^\s"<>]+meeting[^\s"<>]*/i,
    );
    if (zoomMatch) meetingLink = zoomMatch[0];
    else if (meetMatch) meetingLink = meetMatch[0];
    else if (teamsMatch) meetingLink = teamsMatch[0];
    else if (genericMatch) meetingLink = genericMatch[0];

    // Clean description (strip HTML)
    const cleanDesc = (gEvent.description || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const notes = [
      cleanDesc,
      meetingLink ? `🔗 Meeting link: ${meetingLink}` : "",
      gEvent.location ? `📍 Location: ${gEvent.location}` : "",
      isAllDay ? "📅 All-day event" : "",
      gEvent._sourceCalendarId !== "primary"
        ? `📅 Calendar: ${gEvent._sourceCalendarId}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const localId =
      90000 + Math.abs(hashStr(gEvent.id || gEvent.summary || eventDate));

    calEvents.push({
      id: localId,
      // ── Calendar identity ─────────────────────────────────────────
      calendarId: gEvent._sourceCalendarId || "primary",
      // ── Canonical event fields ─────────────────────────────────────
      title: gEvent.summary || "(No Title)",
      applicant_name: gEvent.summary || "(No Title)",
      interview_stage: "Google Calendar Event",
      start_time: eventTime,
      end_time: gEvent.end?.dateTime
        ? `${String(new Date(gEvent.end.dateTime).getHours()).padStart(2, "0")}:${String(new Date(gEvent.end.dateTime).getMinutes()).padStart(2, "0")}`
        : autoEndTime(eventTime),
      meeting_link: meetingLink,
      google_event_id: gEvent.id || "",
      // ── Legacy fields (rendering compatibility) ───────────────────
      name: gEvent.summary || "(No Title)",
      position: "Google Calendar",
      date: eventDate,
      time: eventTime,
      type: meetingLink ? "Virtual" : "Face-to-Face",
      round: "Google Calendar Event",
      status: "Scheduled",
      interviewer:
        gEvent.organizer?.displayName ||
        gEvent.organizer?.email ||
        "Google Cal",
      notes: notes,
      meetingLink: meetingLink,
      isGoogleEvent: true,
      sourceCalendar: gEvent._sourceCalendarId || "primary",
    });
    gcalSyncedIds.add(localId);
  });
}

/* ──────────────────────────────────────────────
   CREATE EVENT IN GOOGLE CALENDAR
   Called when a new interview is saved with sync enabled.
   Returns the Google event ID (string) on success.
────────────────────────────────────────────── */
async function gcalCreateEvent(ev) {
  if (!gcalSignedIn || !gapi.client.calendar) {
    console.warn("[GCal] Not signed in or API not ready — skipping create");
    return null;
  }

  // ── Duplicate prevention: if this event already has a google_event_id, update instead of insert ──
  if (ev.google_event_id) {
    dbg(
      "[GCal] Event already has google_event_id — calling update instead of create to prevent duplicate.",
    );
    return await gcalUpdateEvent(ev);
  }

  // Use the event's saved calendarId — this is the key multi-calendar feature
  const targetCalendarId = ev.calendarId || "primary";
  const calConfig = getCalConfig(targetCalendarId);

  const dateStr = ev.date;
  const startISO = `${dateStr}T${ev.start_time || ev.time || "09:00"}:00`;
  const endISO = `${dateStr}T${ev.end_time || autoEndTime(ev.time || "09:00")}:00`;

  // Build a clean ASCII-safe summary — Google Meet derives its room name from this.
  // Non-ASCII chars (em dashes, accented letters, etc.) trigger "invalid video call name".
  const _rawSummary =
    ev.title ||
    `${ev.interview_stage || ev.round || "Interview"} - ${ev.applicant_name || ev.name || "Applicant"}`;
  const _safeSummary =
    _rawSummary
      .replace(/[–—]/g, "-") // em/en dash → hyphen
      .replace(/[^a-zA-Z0-9 \-_.,:']/g, "") // strip chars Google rejects in Meet room names
      .replace(/\s+/g, " ") // collapse whitespace
      .trim() || "Interview"; // final fallback

  const resource = {
    summary: _safeSummary,
    description: [
      `Applicant: ${ev.applicant_name || ev.name}`,
      `Position: ${ev.position}`,
      `Stage: ${ev.interview_stage || ev.round}`,
      `Type: ${ev.type}`,
      `Interviewer: ${ev.interviewer || ""}`,
      calConfig
        ? `Calendar: ${calConfig.calendarName} (${calConfig.calendarType})`
        : "",
      ev.meeting_link || ev.meetingLink
        ? `Meeting Link: ${ev.meeting_link || ev.meetingLink}`
        : "",
      ev.notes ? `Notes: ${ev.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    start: { dateTime: startISO, timeZone: "Asia/Manila" },
    end: { dateTime: endISO, timeZone: "Asia/Manila" },
    ...(ev.meeting_link || ev.meetingLink
      ? { location: ev.meeting_link || ev.meetingLink }
      : {}),
    // Auto-create a real Google Meet room when no manual link is provided
    ...(!ev.meeting_link && !ev.meetingLink
      ? {
          conferenceData: {
            createRequest: {
              requestId: `upstaff-${ev.id || Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }
      : {}),
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 60 },
        { method: "popup", minutes: 10 },
        { method: "email", minutes: 60 },
      ],
    },
  };

  try {
    const resp = await gapi.client.calendar.events.insert({
      calendarId: targetCalendarId,
      resource,
      conferenceDataVersion: 1, // required for Google to create the Meet room
    });
    const gEventId = resp.result.id;

    // Extract the real Meet link Google generated and save it back to the local event
    const realMeetLink =
      resp.result?.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === "video",
      )?.uri || null;
    if (realMeetLink) {
      ev.meeting_link = realMeetLink;
      ev.meetingLink = realMeetLink;
      persistSave();
      dbg("[GCal] ✅ Real Meet room created:", realMeetLink);
    }

    dbg(
      `[GCal] ✅ Event created in "${calConfig?.calendarName || targetCalendarId}":`,
      gEventId,
    );
    return gEventId;
  } catch (err) {
    console.error("[GCal] ❌ Create failed:", err);
    throw err;
  }
}

/* ──────────────────────────────────────────────
   UPDATE EVENT IN GOOGLE CALENDAR
   Called when an existing interview with a google_event_id is saved.
────────────────────────────────────────────── */
async function gcalUpdateEvent(ev) {
  if (!gcalSignedIn || !ev.google_event_id) return;

  const targetCalendarId = ev.calendarId || "primary";
  const dateStr = ev.date;
  const startISO = `${dateStr}T${ev.start_time || ev.time || "09:00"}:00`;
  const endISO = `${dateStr}T${ev.end_time || autoEndTime(ev.time || "09:00")}:00`;

  const resource = {
    summary:
      ev.title ||
      `${ev.interview_stage || ev.round} – ${ev.applicant_name || ev.name}`,
    description: [
      `Applicant: ${ev.applicant_name || ev.name}`,
      `Position: ${ev.position}`,
      `Stage: ${ev.interview_stage || ev.round}`,
      `Type: ${ev.type}`,
      `Interviewer: ${ev.interviewer || ""}`,
      ev.meeting_link || ev.meetingLink
        ? `Meeting Link: ${ev.meeting_link || ev.meetingLink}`
        : "",
      ev.notes ? `Notes: ${ev.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    start: { dateTime: startISO, timeZone: "Asia/Manila" },
    end: { dateTime: endISO, timeZone: "Asia/Manila" },
    ...(ev.meeting_link || ev.meetingLink
      ? { location: ev.meeting_link || ev.meetingLink }
      : {}),
  };

  try {
    await gapi.client.calendar.events.update({
      calendarId: targetCalendarId,
      eventId: ev.google_event_id,
      resource,
    });
    dbg(
      `[GCal] ✅ Event updated in "${targetCalendarId}":`,
      ev.google_event_id,
    );
  } catch (err) {
    console.error("[GCal] ❌ Update failed:", err);
    throw err;
  }
}

/* ──────────────────────────────────────────────
   DELETE EVENT FROM GOOGLE CALENDAR
────────────────────────────────────────────── */
async function gcalDeleteEvent(googleEventId, calendarId = "primary") {
  if (!gcalSignedIn || !googleEventId) return;
  try {
    await gapi.client.calendar.events.delete({
      calendarId: calendarId,
      eventId: googleEventId,
    });
    dbg(`[GCal] ✅ Event deleted from "${calendarId}":`, googleEventId);
  } catch (err) {
    console.error("[GCal] ❌ Delete failed:", err);
    throw err;
  }
}

/* ──────────────────────────────────────────────
   HELPER: stable string hash for local IDs
────────────────────────────────────────────── */
function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 89999;
}

/* openEdit + closeModal overrides removed — logic merged into originals above */

/* ══════════════════════════════════════════════
   PART 2: INTERVIEW REMINDER NOTIFICATIONS
   ──────────────────────────────────────────────
   HOW IT WORKS:
   • Every 60 seconds, we scan ALL calEvents (local + Google)
   • If an interview is exactly 60 min or 10 min away → fire a reminder
   • Shows a large in-app banner + a browser push notification
   • Each reminder only fires ONCE per interview per threshold
   • Persists through re-syncs using a Set of fired keys
══════════════════════════════════════════════ */

/* ──────────────────────────────────────────────
   REMINDER BANNER HTML — injected into <body>
   This is the large overlay that slides down
   from the top of the screen when triggered
────────────────────────────────────────────── */
(function createReminderBanner() {
  const banner = document.createElement("div");
  banner.id = "reminder-banner";
  banner.style.cssText = `
    display:none; position:fixed; top:0; left:0; right:0; z-index:99999;
    background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);
    color:#fff; padding:0; box-shadow:0 8px 40px rgba(0,0,0,.5);
    font-family:"DM Sans",sans-serif; animation:reminderSlideDown .4s ease;
  `;
  banner.innerHTML = `
    <style>
      @keyframes reminderSlideDown {
        from { transform:translateY(-100%); opacity:0; }
        to   { transform:translateY(0);    opacity:1; }
      }
      @keyframes reminderPulse {
        0%,100% { box-shadow:0 0 0 0 rgba(68,215,233,.4); }
        50%      { box-shadow:0 0 0 12px rgba(68,215,233,0); }
      }
      #reminder-banner-inner {
        max-width:900px; margin:0 auto; padding:18px 24px;
        display:flex; align-items:center; gap:18px;
      }
      #reminder-icon-wrap {
        width:52px; height:52px; border-radius:16px; flex-shrink:0;
        display:flex; align-items:center; justify-content:center;
        animation: reminderPulse 1.8s infinite;
      }
      #reminder-content { flex:1; min-width:0; }
      #reminder-label {
        font-size:11px; font-weight:700; text-transform:uppercase;
        letter-spacing:.08em; font-family:"Montserrat",sans-serif;
        margin-bottom:3px; opacity:.75;
      }
      #reminder-name {
        font-size:17px; font-weight:700; font-family:"Syne",sans-serif;
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      }
      #reminder-meta {
        font-size:12px; opacity:.7; margin-top:3px; font-weight:500;
        display:flex; align-items:center; gap:10px; flex-wrap:wrap;
      }
      #reminder-actions { display:flex; align-items:center; gap:8px; flex-shrink:0; }
      #reminder-join-btn {
        display:none; padding:9px 18px; border-radius:10px;
        background:var(--cyan); color:#0f172a; font-size:12px; font-weight:700;
        font-family:"Montserrat",sans-serif; text-decoration:none; border:none;
        cursor:pointer; white-space:nowrap; transition:background .15s;
        align-items:center; gap:6px;
      }
      #reminder-join-btn:hover { background:#2cc5d6; }
      #reminder-view-btn {
        padding:9px 18px; border-radius:10px;
        background:rgba(255,255,255,.1); color:#fff; font-size:12px; font-weight:700;
        font-family:"Montserrat",sans-serif; border:1px solid rgba(255,255,255,.2);
        cursor:pointer; white-space:nowrap; transition:background .15s;
      }
      #reminder-view-btn:hover { background:rgba(255,255,255,.18); }
      #reminder-dismiss-btn {
        width:32px; height:32px; border-radius:8px; border:none;
        background:rgba(255,255,255,.08); color:rgba(255,255,255,.6);
        cursor:pointer; display:flex; align-items:center; justify-content:center;
        transition:background .15s; flex-shrink:0;
      }
      #reminder-dismiss-btn:hover { background:rgba(255,255,255,.15); color:#fff; }
      #reminder-countdown {
        font-size:11px; font-weight:700; font-family:"Montserrat",sans-serif;
        padding:3px 10px; border-radius:6px; white-space:nowrap;
      }
    </style>
    <div id="reminder-banner-inner">
      <div id="reminder-icon-wrap">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </div>
      <div id="reminder-content">
        <div id="reminder-label">⏰ Upcoming Interview Reminder</div>
        <div id="reminder-name">Interview with Applicant</div>
        <div id="reminder-meta">
          <span id="reminder-time-str"></span>
          <span>•</span>
          <span id="reminder-position"></span>
          <span id="reminder-type-str"></span>
        </div>
      </div>
      <div id="reminder-actions">
        <span id="reminder-countdown"></span>
        <a id="reminder-join-btn" target="_blank" rel="noopener noreferrer">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.914L15 14"/><rect x="1" y="6" width="15" height="12" rx="2"/></svg>
          Join Meeting
        </a>
        <button id="reminder-view-btn" onclick="reminderViewEvent()">View Details</button>
        <button id="reminder-dismiss-btn" onclick="dismissReminder()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);
})();

/* ──────────────────────────────────────────────
   REQUEST BROWSER NOTIFICATION PERMISSION
   Called once when the page loads.
   The browser will show a one-time "Allow notifications?" popup.
────────────────────────────────────────────── */
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        dbg("[Reminders] ✅ Browser notifications allowed");
      } else {
        dbg(
          "[Reminders] ℹ️  Browser notifications denied — in-app banner only",
        );
      }
    });
  }
}

/* ──────────────────────────────────────────────
   START REMINDER CHECKER
   Runs every 60 seconds, checks all events.
   Also runs immediately on first call.
────────────────────────────────────────────── */
function startReminderChecker() {
  // Clear any previous timer (avoid duplicates on re-sync)
  if (reminderTimer) clearInterval(reminderTimer);

  // Run once immediately, then every 60 seconds
  checkUpcomingReminders();
  reminderTimer = setInterval(() => {
    checkUpcomingReminders();
    syncGCalCancellationsToRecruitment(); // ← reflect GCal cancellations back
  }, 60 * 1000);
  dbg("[Reminders] ✅ Reminder checker started");
}

/* ──────────────────────────────────────────────
   SYNC GCAL CANCELLATIONS → RECRUITMENT SYSTEM
   Checks all calEvents for status==='cancelled' (Google's own flag)
   and mirrors that to the matching TASK so both stay in sync.
────────────────────────────────────────────── */
function syncGCalCancellationsToRecruitment() {
  let changed = false;
  calEvents.forEach((ev) => {
    if (
      (ev.status === "cancelled" || ev.status === "Cancelled") &&
      ev.google_event_id
    ) {
      // Find the matching TASK by gcalEventId
      const task = TASKS.find((t) => t.gcalEventId === ev.google_event_id);
      if (task && task.status !== "Cancelled") {
        task.status = "Cancelled";
        changed = true;
        dbg(
          `[GCalSync] 🔄 Task "${task.name}" auto-cancelled because GCal event was cancelled.`,
        );
        showToast(
          `📅 "${task.name}" cancelled — mirrored from Google Calendar.`,
        );
      }
    }
  });
  if (changed) {
    persistSave();
    refreshCurrentView();
  }
}

/* ──────────────────────────────────────────────
   CHECK UPCOMING REMINDERS
   Main logic: scans ALL calEvents and fires
   a reminder if an interview is N minutes away.
────────────────────────────────────────────── */
function checkUpcomingReminders() {
  const now = new Date();

  calEvents.forEach((evt) => {
    // Support both legacy `time` and new `start_time` field
    const evtTime = evt.time || evt.start_time;
    if (!evt.date || !evtTime) return;
    if (evt.status === "Cancelled" || evt.status === "Completed") return;

    // Build a Date object for the event start time
    const [hours, minutes] = evtTime.split(":").map(Number);
    const evtStart = new Date(evt.date);
    evtStart.setHours(hours, minutes, 0, 0);

    // How many minutes until this event?
    const minutesUntil = (evtStart - now) / (1000 * 60);

    // Check each configured reminder threshold (e.g. 60 min, 10 min)
    GCAL_CONFIG.REMINDER_MINUTES.forEach((threshold) => {
      // Fire if we're within ±1 minute of the threshold
      if (minutesUntil > threshold - 1 && minutesUntil <= threshold + 1) {
        const key = `${evt.id}-${threshold}`;
        if (!remindersFired.has(key)) {
          remindersFired.add(key);
          fireReminder(evt, threshold);
        }
      }
    });
  });
}

/* ──────────────────────────────────────────────
   FIRE A REMINDER
   Shows both the in-app banner AND a browser push notification
────────────────────────────────────────────── */
let _reminderCurrentEventId = null; // Track which event the banner is showing

function fireReminder(evt, minutesBefore) {
  _reminderCurrentEventId = evt.id;

  const label =
    minutesBefore >= 60
      ? `${minutesBefore / 60} hour${minutesBefore > 60 ? "s" : ""}`
      : `${minutesBefore} minutes`;

  const timeStr = fmtTime(evt.time || evt.start_time);
  const stageName = evt.interview_stage || evt.round || "Interview";
  const meetLink = evt.meeting_link || evt.meetingLink || "";
  const countdownColor = minutesBefore <= 10 ? "#fa8231" : "#44d7e9";

  // ── Helper: safe set text ──
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  // ── Update banner content ──
  setText("reminder-name", `${evt.applicant_name || evt.name} — ${stageName}`);
  setText("reminder-time-str", `⏰ ${timeStr}`);
  setText("reminder-position", evt.position || "");
  setText(
    "reminder-type-str",
    evt.type
      ? `• ${evt.type === "Virtual" ? "📹 Virtual" : "🏢 Face-to-Face"}`
      : "",
  );
  setText("reminder-countdown", `In ${label}`);

  const countdown = document.getElementById("reminder-countdown");
  if (countdown)
    countdown.style.cssText = `font-size:11px;font-weight:700;font-family:"Montserrat",sans-serif;padding:3px 10px;border-radius:6px;white-space:nowrap;background:${countdownColor}22;color:${countdownColor};border:1px solid ${countdownColor}44;`;

  // Color the icon based on urgency
  const iconWrap = document.getElementById("reminder-icon-wrap");
  if (iconWrap) {
    iconWrap.style.background =
      minutesBefore <= 10 ? "rgba(250,130,49,.2)" : "rgba(68,215,233,.15)";
    iconWrap.style.color =
      minutesBefore <= 10 ? "var(--orange)" : "var(--cyan)";
    iconWrap.style.border = `1.5px solid ${minutesBefore <= 10 ? "rgba(250,130,49,.3)" : "rgba(68,215,233,.3)"}`;
  }

  // Show/hide Join Meeting button
  const joinBtn = document.getElementById("reminder-join-btn");
  if (joinBtn) {
    if (meetLink) {
      joinBtn.href = meetLink;
      joinBtn.style.display = "flex";
    } else {
      joinBtn.style.display = "none";
    }
  }

  // Show the banner
  const banner = document.getElementById("reminder-banner");
  if (banner) {
    banner.style.display = "block";
    // Re-trigger animation on repeated reminders
    banner.style.animation = "none";
    setTimeout(() => {
      banner.style.animation = "reminderSlideDown .4s ease";
    }, 10);
  }

  // Auto-dismiss after 30 seconds (only for the 60-min warning; keep 10-min open longer)
  const autoDismissMs = minutesBefore <= 10 ? 60000 : 30000;
  setTimeout(() => dismissReminder(), autoDismissMs);

  // ── Browser push notification (if permission granted) ──
  if ("Notification" in window && Notification.permission === "granted") {
    const notifBody = [
      `${evt.applicant_name || evt.name} — ${stageName} starts in ${label}.`,
      evt.position ? `Position: ${evt.position}` : "",
      meetLink ? `Click here to join: ${meetLink}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const notif = new Notification(
      `⏰ Interview Reminder: ${evt.applicant_name || evt.name}`,
      {
        body: notifBody,
        icon: "https://fonts.gstatic.com/s/i/materialicons/event/v6/24px.svg",
        tag: `interview-${evt.id}-${minutesBefore}`, // Prevents duplicate notifications
        requireInteraction: minutesBefore <= 10, // Stays until clicked for 10-min alerts
      },
    );
    notif.onclick = () => {
      window.focus();
      dismissReminder();
      // Switch to calendar view and open the event
      switchView("calendar");
      setTimeout(() => openEdit(evt.id), 300);
    };
  }

  dbg(
    `[Reminders] 🔔 Fired reminder for "${evt.applicant_name || evt.name}" (${stageName}) — ${label} away`,
  );
}

/* ──────────────────────────────────────────────
   DISMISS BANNER
────────────────────────────────────────────── */
function dismissReminder() {
  const banner = document.getElementById("reminder-banner");
  if (!banner) return;
  banner.style.transition = "opacity .3s";
  banner.style.opacity = "0";
  setTimeout(() => {
    banner.style.display = "none";
    banner.style.opacity = "1";
    banner.style.transition = "";
  }, 300);
}

/* ──────────────────────────────────────────────
   VIEW EVENT from banner button
────────────────────────────────────────────── */
function reminderViewEvent() {
  dismissReminder();
  if (_reminderCurrentEventId !== null) {
    switchView("calendar");
    setTimeout(() => openEdit(_reminderCurrentEventId), 300);
  }
}

/* ──────────────────────────────────────────────
   PAGE LOAD BOOTSTRAP
   ─────────────────────────────────────────────
   Order of operations:
   1. persistLoad() already ran above (data hydrated before first render)
   2. Load GIS script → triggers gcalInit()
   3. gcalInit() loads gapi + attempts silent OAuth re-auth if previously signed in
   4. If silent re-auth succeeds → gcalFetchAllCalendars() merges Google events
   5. If it fails → local events from localStorage are still shown
────────────────────────────────────────────── */
window.addEventListener("load", () => {
  // Restore Google Calendar sync badge UI if user was previously synced
  const lastCount = localStorage.getItem(LS_KEYS.GCAL_COUNT);
  const wasSignedIn = localStorage.getItem(LS_KEYS.GCAL_AUTH) === "1";
  if (wasSignedIn && lastCount) {
    updateSyncBtnState(`Last synced (${lastCount})`);
    document.getElementById("gcal-status-badge").style.display = "flex";
    document.getElementById("gcal-status-text").textContent =
      `${lastCount} events — reconnecting…`;
  }

  // Load Google Identity Services for OAuth
  const gisScript = document.createElement("script");
  gisScript.src = "https://accounts.google.com/gsi/client";
  gisScript.onload = () => {
    if (typeof gapi !== "undefined") gcalInit();
    else setTimeout(gcalInit, 500);
  };
  gisScript.onerror = () => {
    console.warn("[GCal] Could not load GIS script — offline or blocked?");
    if (wasSignedIn) updateSyncBtnState("Offline — local events only", true);
  };
  document.head.appendChild(gisScript);

  // Request browser notification permission
  requestNotificationPermission();

  // Start reminders immediately for persisted local calendar events
  startReminderChecker();

  dbg(
    `[Bootstrap] ✅ Page loaded. ${calEvents.length} local event(s) from localStorage ready.`,
  );
});

/* ══════════════════════════════════════════════
   END OF GOOGLE CALENDAR + REMINDER SYSTEM
══════════════════════════════════════════════ */
