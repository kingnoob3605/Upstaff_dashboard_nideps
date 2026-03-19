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
  if (!confirm("Delete ALL tasks? This cannot be undone.")) return;
  TASKS = [];
  persistSave();
  refreshCurrentView();
  showToast("🗑️ All tasks deleted.");
}

function handleClearCalendar() {
  if (!confirm("Delete ALL calendar events? This cannot be undone.")) return;
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
  if (
    !confirm(
      "Clear ALL saved data including Google auth? You will need to re-authorise Google Calendar.",
    )
  )
    return;
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
  }
});
