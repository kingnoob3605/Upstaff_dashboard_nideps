/**
 * pm-ui-views.js — All UI rendering for the Upstaff Dashboard.
 *
 * SECTION MAP (search for the tag to jump directly):
 *  [SECTION: VIEW-SWITCH]    switchView, showSettings
 *  [SECTION: LIST-VIEW]      renderList, renderListStatusTabs, getListFilters, pagination, sorting
 *  [SECTION: QUICK-ADD]      quickAddApplicant, listCancelApplicant, listAdvanceStage
 *  [SECTION: TODO-VIEW]      renderTodos, openTodoModal, saveTodo, toggleTodoDone
 *  [SECTION: BOARD-VIEW]     renderBoard, boardDragStart, boardDragEnd, boardDrop
 *  [SECTION: MODAL-TABS]     _switchModalTab, tab population helpers
 *  [SECTION: MODAL-OPEN]     openTaskNew, openTaskEdit
 *  [SECTION: MODAL-SAVE]     saveTaskForm, status transitions, hire/reject
 *  [SECTION: INTERVIEW]      _populateInterviewScheduleTab, saveInterviewSchedule
 *  [SECTION: REVIEW-TAB]     _populateReviewTab, _renderReviewScheduledList
 *  [SECTION: ASSESSMENT]     _updateAssessmentPanel, sendAssessmentEmail
 *  [SECTION: CALENDAR]       renderCalendar, renderMonth, renderWeek, renderDay, renderAgenda
 *  [SECTION: EMPLOYEE]       openEmpDetail, saveEmpDetailChanges
 *  [SECTION: HIRE-MODAL]     openHireModal, saveNewHire
 *  [SECTION: ANALYTICS]      renderAnalytics, exportAnalyticsCSV
 *  [SECTION: SETTINGS-UI]    renderSettingsCalendarList, renderSettingsMembers
 *  [SECTION: NOTIF-UI]       renderNotifPanel
 *  [SECTION: ACTIVITY-UI]    renderActivityTab, renderFilesTab
 *  [SECTION: UTILITIES]      sanitize wrappers, avatarColor, initials, fmtDue, dueCls
 *
 * NOTE: This file is a candidate for splitting into separate ES modules.
 * Until a build system is added, keep all utilities in this file as they
 * are shared across all sections. Splitting requires resolving cross-section
 * function dependencies first.
 */

/* ══════════════════════════════════════════════
   [SECTION: VIEW-SWITCH] — project views + settings
══════════════════════════════════════════════ */
const PROJECT_VIEWS = ["list", "board", "calendar", "table", "mytasks", "jobs"];

/**
 * switchView(v) — switches between the 5 project board views.
 * Called by the view-tab buttons and by the sidebar Calendar link.
 */
function switchView(v) {
  // Clear any active bulk selection when switching views
  if (typeof selectedTaskIds !== "undefined") {
    selectedTaskIds.clear();
    const tb = document.getElementById("bulk-toolbar");
    if (tb) tb.style.display = "none";
  }
  // Show view bar, hide settings, analytics, candidates, todos
  const _s = (id, val) => { const e = document.getElementById(id); if (e) e.style.display = val; };
  _s("view-bar", "");
  _s("view-settings", "none");
  _s("view-analytics", "none");
  _s("view-candidates", "none");
  _s("view-onboarding", "none");
  _s("topbar-filter-btn", "");

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
  const crumbCurrent = document.getElementById("crumb-current");
  const crumbParent  = document.getElementById("crumb-parent");
  const btnAddTask   = document.getElementById("btn-add-task");
  if (crumbCurrent) crumbCurrent.textContent = labels[v] || v;
  if (crumbParent)  crumbParent.textContent  = "Recruitment";
  if (btnAddTask)   btnAddTask.style.display  = v === "calendar" || v === "mytasks" ? "none" : "";

  // Render content
  if (v === "list") renderList();
  else if (v === "board") renderBoard();
  else if (v === "calendar") renderCalendar();
  else if (v === "table") renderTable();
  else if (v === "mytasks") renderTodos();
  else if (v === "jobs") loadJobsView();
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
  populateGCalApiSettings();
  populateEmailJSSettings();
  populateApiSettings();
  if (window._settingsLoad) window._settingsLoad();
}

/* ── localStorage status display ── */
function refreshStorageStatus() {
  const el = document.getElementById("storage-status-rows");
  if (!el) return;

  const localCount = calEvents.filter((e) => !e.isGoogleEvent).length;
  const googleCount = calEvents.filter((e) => e.isGoogleEvent).length;
  const wasSignedIn = localStorage.getItem(getUserGcalAuthKey()) === "1";

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
  // Storage usage bar — update in place to avoid duplicate bars on refresh
  try {
    const bytes = new Blob([JSON.stringify(localStorage)]).size;
    const MB = bytes / (1024 * 1024);
    const pct = Math.min(Math.round((MB / 5) * 100), 100);
    const barColor =
      pct > 85 ? "#ef4444" : pct > 65 ? "#fa8231" : "var(--cyan)";
    let barWrap = document.getElementById("storage-usage-wrap");
    if (!barWrap) {
      barWrap = document.createElement("div");
      barWrap.id = "storage-usage-wrap";
      barWrap.style.marginTop = "12px";
      el.insertAdjacentElement("afterend", barWrap);
    }
    barWrap.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:4px;">
        <span>Storage Usage</span>
        <span>${MB.toFixed(2)} MB (~${pct}% of 5 MB)</span>
      </div>
      <div style="height:6px;border-radius:99px;background:var(--border);overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${barColor};border-radius:99px;transition:width 0.3s;"></div>
      </div>`;
  } catch (_) {}
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

/* ══════════════════════════════════════════════
   [SECTION: LIST-VIEW]
══════════════════════════════════════════════ */
function renderListStatusTabs() {
  // STATUS STRINGS — ordered by pipeline stage (defined in pm-ui-core.js)
  const allStatuses = LIST_STATUS_ORDER;
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
          ${sanitize(tag.label)} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </span>`,
          )
          .join("") +
        `<button class="clear-filters-btn" onclick="clearAllListFilters()">Clear all</button>`
      : "";
  }

  // Group by status
  const order = [...ACTIVE_STAGES, "Hired", "Others", "Closed", "Rejected", "Cancelled", "Not Qualified", "No Show", "Duplicate Lead", "Hired - Resigned"];
  const groups = {};
  tasks.forEach((t) => {
    if (!groups[t.status]) groups[t.status] = [];
    groups[t.status].push(t);
  });

  let html = "";
  let anySection = false;
  order.forEach((st) => {
    // "Others" is a virtual group — handle separately
    let sectionLabel = st;
    let stTasks;

    if (st === "Others") {
      if (f.status && !OTHERS_STATUSES.includes(f.status)) return;
      if (f.status && OTHERS_STATUSES.includes(f.status)) {
        // User clicked a specific Others sub-tab — show that sub-status
        sectionLabel = f.status;
        stTasks = sortTasks(groups[f.status] || []);
      } else {
        // "All" tab — merge all OTHERS_STATUSES into one section
        sectionLabel = "Others";
        stTasks = sortTasks(OTHERS_STATUSES.flatMap((s) => groups[s] || []));
      }
    } else {
      if (f.status && st !== f.status) return; // skip if filtered to one status
      stTasks = sortTasks(groups[st] || []);
    }

    // On "All" tab, always show active pipeline stages even when empty
    // (mirrors Board view), but hide empty terminal/others/closed stages
    if (!f.status && stTasks.length === 0 && !ACTIVE_STAGES.includes(st)) return;
    const sm = STATUS_META[sectionLabel] || STATUS_META[st] || STATUS_META["New"];
    const allInStatus = st === "Others"
      ? TASKS.filter((t) => OTHERS_STATUSES.includes(t.status)).length
      : TASKS.filter((t) => t.status === st).length;
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
          <span class="list-section-title" style="color:${sm.color}">${sectionLabel}</span>
          <span class="list-section-count">${stTasks.length}${stTasks.length !== allInStatus ? `/${allInStatus}` : ""}</span>
        </div>
        ${stTasks.length > 0 ? `<div class="list-section-progress"><div class="list-section-progress-fill" style="width:${sectionLabel === "Done" ? 100 : sectionLabel === "Cancelled" ? 100 : Math.round((stTasks.length / Math.max(allInStatus, 1)) * 100)}%;background:${sm.color};"></div></div>` : ""}
      </div>
      <div class="list-section-body">
      <table class="list-table">
        <thead><tr>
          <th class="col-bulk"></th>
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
              ? `<tr><td colspan="8"><div class="list-empty-state">
            <div class="list-empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
            <div class="list-empty-title">No matching applicants</div>
            <div class="list-empty-sub">Try adjusting your filters</div>
          </div></td></tr>`
              : stTasks
                  .map((t) => {
                    const _assignees =
                      t.assignees || (t.assignee ? [t.assignee] : ["HR"]);
                    const ac = avatarColor(_assignees[0] || "HR");
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
                        : t.status === "Closed" || t.status === "Cancelled" || t.status === "Rejected"
                          ? "list-row-cancelled"
                          : "";
                    const pc = PRIORITY_COLORS[t.priority] || "#9ca3af";
                    return `<tr class="${rowCls}" onclick="openTaskEdit(${t.id})">
              <td class="col-bulk" onclick="event.stopPropagation();"><input type="checkbox" class="bulk-cb" ${typeof selectedTaskIds !== "undefined" && selectedTaskIds.has(t.id) ? "checked" : ""} onchange="toggleBulkSelect(${t.id},this)"></td>
              <td><div class="task-name-cell">
                <div class="task-check ${TERMINAL_STAGES.includes(t.status) ? "checked" : ""}" onclick="event.stopPropagation();toggleDone(${t.id})" title="Advance stage">
                  ${TERMINAL_STAGES.includes(t.status) ? `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>` : ""}
                </div>
                <div style="min-width:0;">
                  <div class="task-name ${t.status === "Hired" || t.status === "Done" ? "done" : t.status === "Closed" || t.status === "Cancelled" || t.status === "Rejected" ? "cancelled" : ""}">
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
              <td class="col-recruiter"><div class="assignee-chip">${_assignees
                .slice(0, 3)
                .map(
                  (a, i) =>
                    `<div class="assignee-avatar" style="background:${avatarColor(a)};margin-left:${i > 0 ? "-6px" : "0"};z-index:${3 - i};" title="${sanitize(a)}">${initials(a)}</div>`,
                )
                .join(
                  "",
                )}${_assignees.length > 3 ? `<span style="font-size:10px;color:var(--muted);margin-left:4px;">+${_assignees.length - 3}</span>` : ""}<span style="font-size:12px;margin-left:4px;">${sanitize(_assignees[0]) || "—"}</span></div></td>
              <td class="col-intdate">${intDateHTML}</td>
              <td>
                <span class="${statusPillClass(t.status)}">${t.status}</span>
                ${t.partner_status ? `<span style="display:block;margin-top:3px;font-size:9px;padding:1px 6px;border-radius:99px;background:rgba(62,207,223,.12);color:#3ecfdf;font-weight:600;font-family:'Montserrat',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;" title="${sanitize(t.partner_status)}">${sanitize(t.partner_status)}</span>` : ""}
                ${t.rejection_reason && t.status === "Rejected" ? `<span style="display:block;margin-top:3px;font-size:9px;padding:1px 6px;border-radius:99px;background:#fee2e2;color:#ef4444;font-weight:600;font-family:'Montserrat',sans-serif;">${sanitize(t.rejection_reason)}</span>` : ""}
                ${stageMini}
              </td>
              <td class="col-scores"><div class="list-scores-cell">${scoresHTML || `<span style="font-size:11px;color:var(--light);">—</span>`}</div></td>
              <td onclick="event.stopPropagation()"><div class="list-row-actions">
                <button class="list-actions-btn" onclick="toggleListActionMenu(${t.id},this)" title="Actions">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg>
                </button>
              </div></td>
            </tr>`;
                  })
                  .join("")
          }
          <tr class="add-task-row"><td colspan="8">
            <button class="add-task-btn" onclick="openTaskNew('${sectionLabel}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
               Add applicant in ${sectionLabel}
            </button>
          </td></tr>
        </tbody>
      </table>
      </div>
    </div>`;
  });

  if (!anySection)
    html = `<div class="empty-state">
      <div class="empty-state-icon">👥</div>
      <div class="empty-state-title">${TASKS.length === 0 ? "No applicants yet" : "No applicants match your filters"}</div>
      <div class="empty-state-subtitle">${TASKS.length === 0 ? "Click <strong>+ Add Applicant</strong> in the top right to get started." : "Try adjusting or clearing your filters."}</div>
    </div>`;

  // Render the fully-built html into the DOM
  const _listEl = document.getElementById("list-sections");
  if (_listEl) {
    _listEl.innerHTML =
      '<div class="skeleton-list-wrap">' +
      Array(5).fill('<div class="skeleton skeleton-list-row"></div>').join("") +
      "</div>";
    requestAnimationFrame(() => {
      _listEl.innerHTML = html;
    });
  }

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
      prevBtn.title =
        listCurrentPage <= 1 ? "You are on the first page" : "Previous page";
      nextBtn.title =
        listCurrentPage >= totalPages
          ? "You are on the last page"
          : "Next page";
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
function buildListActionMenuHTML(taskId) {
  const t = TASKS.find(x => x.id === taskId);
  if (!t) return "";
  const curIdx = STAGE_ORDER.indexOf(t.status);
  const fwd = curIdx >= 0 ? STAGE_ORDER.slice(curIdx + 1).filter(s => !TERMINAL_STAGES.includes(s)) : [];
  const othersOpts = OTHERS_STATUSES.filter(s => s !== t.status);
  const moveToSub = (fwd.length || othersOpts.length) ? `<div class="lam-item lam-has-sub" onmouseenter="this.querySelector('.lam-sub').style.display='block'" onmouseleave="this.querySelector('.lam-sub').style.display='none'" style="position:relative;display:flex;align-items:center;gap:8px;cursor:pointer;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
    Move to Stage
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-left:auto;"><polyline points="9 18 15 12 9 6"/></svg>
    <div class="lam-sub" style="display:none;position:fixed;background:var(--surface-1);border:1.5px solid var(--border);border-radius:10px;padding:4px;box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:9200;min-width:180px;">
      ${fwd.map(st => `<button class="lam-item" onclick="moveApplicantToStage(${taskId},'${st}');closeAllListMenus()">${st}</button>`).join("")}
      ${othersOpts.length ? (fwd.length ? `<div style="margin:4px 4px;border-top:1px solid var(--border);"></div>` : "") + `<div style="padding:4px 8px 2px;font-size:10px;font-weight:700;color:var(--muted);font-family:'Montserrat',sans-serif;text-transform:uppercase;letter-spacing:.5px;">Others</div>` + othersOpts.map(st => `<button class="lam-item" onclick="moveApplicantToStage(${taskId},'${st}');closeAllListMenus()">${st}</button>`).join("") : ""}
    </div>
  </div>` : "";
  const prevStage = getPrevStage(t.status);
  const moveBack = prevStage ? `<button class="lam-item" onclick="listRevertStage(${taskId});closeAllListMenus()">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
    Move Back to ${prevStage}
  </button>` : "";
  return `
    <button class="lam-item" onclick="openTaskEdit(${taskId});closeAllListMenus()">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Edit Applicant
    </button>
    <button class="lam-item" onclick="listAdvanceStage(${taskId})">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      Advance Stage
    </button>
    ${moveToSub}
    ${moveBack}
    <button class="lam-item" onclick="listScheduleInterview(${taskId});closeAllListMenus()">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      Schedule Interview
    </button>
    <div class="lam-sep"></div>
    <button class="lam-item" onclick="openTaskEdit(${taskId},true);closeAllListMenus()">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      View Scores
    </button>
    <div class="lam-sep"></div>
    <button class="lam-item lam-danger" onclick="listRejectApplicant(${taskId})">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      Reject Applicant
    </button>
    <button class="lam-item lam-danger" onclick="listCancelApplicant(${taskId})">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      Cancel Application
    </button>
    <button class="lam-item lam-danger" onclick="listDeleteApplicant(${taskId})">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      Delete Applicant
    </button>`;
}

function toggleListActionMenu(taskId, btnEl) {
  const menu = document.getElementById("list-action-menu");
  if (!menu) return;
  const isOpen = menu.classList.contains("open") && menu.dataset.taskId == taskId;
  closeAllListMenus();
  if (!isOpen) {
    menu.dataset.taskId = taskId;
    menu.innerHTML = buildListActionMenuHTML(taskId);
    // Position relative to the button using fixed coords
    const rect = btnEl.getBoundingClientRect();
    const menuW = 196;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.left;
    const top = spaceBelow > 240 ? rect.bottom + 4 : rect.top - 4;
    const yDir = spaceBelow > 240 ? "top" : "bottom";
    const left = spaceRight > menuW ? rect.left : rect.right - menuW;
    menu.style.top = "";
    menu.style.bottom = "";
    menu.style[yDir] = (yDir === "top" ? top : window.innerHeight - rect.top + 4) + "px";
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
  const menu = document.getElementById("list-action-menu");
  if (menu) menu.classList.remove("open");
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

  moveApplicantToStage(taskId, prev);
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

function listRejectApplicant(taskId) {
  closeAllListMenus();
  const t = TASKS.find((x) => x.id === taskId);
  if (!t) return;
  if (t.status === "Closed") {
    showToast("Already closed/rejected.");
    return;
  }
  moveApplicantToStage(taskId, "Closed");
  showToast(`🚫 ${t.applicant_name || t.name} rejected`);
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
  showToast(`❌ ${t.applicant_name || t.name} marked as Cancelled`);
}

async function listDeleteApplicant(taskId) {
  closeAllListMenus();
  const t = TASKS.find((x) => x.id === taskId);
  if (!t) return;

  const name = t.applicant_name || t.name || "this applicant";
  const confirmed = await uiConfirm(
    `Permanently delete ${name}? This cannot be undone.`,
    { icon: "🗑️", title: "Delete Applicant", okText: "Delete", okDanger: true },
  );
  if (!confirmed) return;

  const idx = TASKS.findIndex((x) => x.id === taskId);

  // If synced to the sheet, delete from API first — only remove locally if it succeeds
  if (
    (t._source === "api" || t.supabase_id) &&
    window.UpstaffAPI &&
    UpstaffAPI.isConfigured()
  ) {
    try {
      await UpstaffAPI.deleteApplicant({
        email: t.applicant_email,
        supabaseId: t.supabase_id,
      });
      if (idx !== -1) TASKS.splice(idx, 1);
      showToast(`🗑️ ${name} deleted.`);
    } catch (e) {
      showToast(`⚠️ Delete failed: ${e.message}`);
      return; // Do not remove locally if API delete failed
    }
  } else {
    // Local-only applicant — safe to remove immediately
    if (idx !== -1) TASKS.splice(idx, 1);
    showToast(`🗑️ ${name} removed.`);
  }

  persistSave();
  refreshCurrentView();
  if (document.getElementById("task-modal")?.style.display !== "none") {
    closeTaskModal();
  }
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
  // In the recruitment pipeline, the check button advances or resets to New
  if (TERMINAL_STAGES.includes(t.status)) {
    t.status = "New";
  } else {
    advanceToNextStage(id);
    return;
  }
  persistSave();
  renderList();
}
document
  .getElementById("list-search")
  ?.addEventListener("input", debounce(renderList, 200));
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
   [SECTION: TODO-VIEW] — Personal Task Manager
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
  _gsapModalOpen("todo-modal-overlay", "todo-modal");
  setTimeout(() => document.getElementById("td-title")?.focus(), 80);
}
function closeTodoModal() {
  _gsapModalClose("todo-modal-overlay", "todo-modal");
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
    status: document.getElementById("list-quickadd-status")?.value || "New",
    priority:
      document.getElementById("list-quickadd-priority")?.value || "Medium",
    position: JOB_POSITIONS[0],
    assignee: "Assistant",
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
   [SECTION: BOARD-VIEW] — Drag & Drop Kanban
══════════════════════════════════════════════ */
function renderBoard() {
  autoProgressStatuses();
  const activeOrder = [...ACTIVE_STAGES, "Hired", "Others", "Closed"];
  let html = "";
  activeOrder.forEach((st) => {
    const tasks = st === "Closed"
      ? TASKS.filter((t) => CLOSED_STATUSES.includes(t.status) && !t.archived)
      : st === "Others"
        ? TASKS.filter((t) => OTHERS_STATUSES.includes(t.status) && !t.archived)
        : TASKS.filter((t) => t.status === st && !t.archived);
    const sm = STATUS_META[st] || STATUS_META["New"];
    const color = sm.color;
    const isTerminal = TERMINAL_STAGES.includes(st);
    html += `<div class="board-col"
      data-status="${st}">
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
            const _boardAssignees =
              t.assignees || (t.assignee ? [t.assignee] : ["HR"]);
            const ac = avatarColor(_boardAssignees[0] || "HR");
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
            data-task-id="${t.id}"
            onclick="openTaskEdit(${t.id})">
            <label class="bulk-cb-wrap" onclick="event.stopPropagation();"><input type="checkbox" class="bulk-cb" ${typeof selectedTaskIds !== "undefined" && selectedTaskIds.has(t.id) ? "checked" : ""} onchange="toggleBulkSelect(${t.id},this)"></label>
            <div class="board-card-name">${sanitize(t.applicant_name || t.name)}</div>
            ${t.partner_status ? `<div style="margin-bottom:4px;"><span style="font-size:9px;padding:1px 7px;border-radius:99px;background:rgba(62,207,223,.13);color:#3ecfdf;font-weight:600;font-family:'Montserrat',sans-serif;white-space:nowrap;">${sanitize(t.partner_status)}</span></div>` : ""}
            <div class="board-card-meta">
              <span class="board-card-pos">${sanitize(t.position)}</span>
              <span class="priority-pill" style="background:${pc}22;color:${pc};font-size:10px;">${t.priority}</span>
              <div style="display:flex;margin-left:auto;">${_boardAssignees
                .slice(0, 2)
                .map(
                  (a, i) =>
                    `<div class="assignee-avatar" style="background:${avatarColor(a)};margin-left:${i > 0 ? "-4px" : "0"};z-index:${2 - i};" title="${sanitize(a)}">${initials(a)}</div>`,
                )
                .join(
                  "",
                )}${_boardAssignees.length > 2 ? `<span style="font-size:9px;color:var(--muted);margin-left:2px;">+${_boardAssignees.length - 2}</span>` : ""}</div>
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
              ${(() => {
                const _bi = STAGE_ORDER.indexOf(t.status);
                const _bfwd =
                  _bi >= 0
                    ? STAGE_ORDER.slice(_bi + 1).filter(
                        (s) => !TERMINAL_STAGES.includes(s),
                      )
                    : [];
                if (_bfwd.length < 2) return "";
                return `<select class="bca-btn bca-skip" title="Skip to stage" onchange="if(this.value){moveApplicantToStage(${t.id},this.value);this.value=''}" onclick="event.stopPropagation()"><option value="">⤸ Skip</option>${_bfwd.map((s) => `<option value="${s}">${s}</option>`).join("")}</select>`;
              })()}
              ${t.status === "For Client Endorsement" ? `<button class="bca-btn bca-hire" onclick="hireApplicant(${t.id})">✓ Hire</button>` : ""}
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
          ${t.rejection_reason ? `<div style="margin-top:4px;font-size:9px;padding:2px 7px;border-radius:99px;background:#fee2e2;color:#ef4444;font-weight:600;display:inline-block;font-family:'Montserrat',sans-serif;">${sanitize(t.rejection_reason)}</div>` : ""}
        </div>`,
          )
          .join("")}
      </div>
    </div>`;
  }

  const _boardEl = document.getElementById("board-wrap");
  if (_boardEl) {
    if (TASKS.length === 0) {
      _boardEl.innerHTML = `<div class="empty-state" style="width:100%;">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">No applicants yet</div>
        <div class="empty-state-subtitle">Click <strong>+ Add Applicant</strong> in the top right to add your first candidate to the pipeline.</div>
      </div>`;
      return;
    }
    _boardEl.innerHTML =
      '<div class="u-flex u-gap-12">' +
      Array(4)
        .fill('<div class="skeleton skeleton-board-card" style="flex:1"></div>')
        .join("") +
      "</div>";
    requestAnimationFrame(() => {
      _boardEl.innerHTML = html;
      // Init SortableJS on every column body
      _sortables.forEach(s => { try { s.destroy(); } catch (_) {} });
      _sortables = [];
      if (window.Sortable) {
        document.querySelectorAll(".board-col-body").forEach(colBody => {
          const s = Sortable.create(colBody, {
            group: "kanban",
            animation: 150,
            ghostClass: "board-card-ghost",
            dragClass: "board-card-dragging",
            filter: ".bulk-cb-wrap, .board-add-btn",
            onEnd(evt) {
              const taskId = +evt.item.dataset.taskId;
              if (!taskId) return;
              const newStatus = evt.to.closest(".board-col")?.dataset.status;
              const oldStatus = evt.from.closest(".board-col")?.dataset.status;
              if (newStatus && oldStatus && newStatus !== oldStatus) {
                moveApplicantToStage(taskId, newStatus);
              }
            },
          });
          _sortables.push(s);
        });
      }
    });
  }
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
let _boardDropProcessing = false;
function boardDrop(event, newStatus) {
  event.preventDefault();
  if (_boardDropProcessing) return; // prevent double-fire during re-render
  const colBody = event.currentTarget.querySelector(".board-col-body");
  if (colBody) colBody.classList.remove("board-drop-active");
  const taskId =
    _dragTaskId || parseInt(event.dataTransfer.getData("text/plain"));
  if (!taskId) return;
  const t = TASKS.find((x) => x.id === taskId);
  if (!t || t.status === newStatus) return;
  _boardDropProcessing = true;
  moveApplicantToStage(taskId, newStatus);
  setTimeout(() => { _boardDropProcessing = false; }, 500);
}

/* ══════════════════════════════════════════════
   MODAL HELPER UTILITIES
══════════════════════════════════════════════ */

/** Update the u-surface-note preview under the Notes textarea */
function _notesPreviewUpdate(text) {
  const preview = document.getElementById("f-notes-preview");
  if (!preview) return;
  const trimmed = (text || "").trim();
  if (trimmed) {
    preview.textContent = "\u201c" + trimmed + "\u201d";
    preview.style.display = "";
  } else {
    preview.style.display = "none";
  }
}

// Wire up live typing preview once DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  const notesEl = document.getElementById("f-notes");
  if (notesEl) notesEl.addEventListener("input", function () {
    _notesPreviewUpdate(this.value);
  });
});

/** Safe field setter — silently skips if element doesn't exist */
function _setField(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value ?? "";
  // For <select> elements: if value doesn't match any option, add it dynamically
  if (el.tagName === "SELECT" && value && el.value !== value) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    el.appendChild(opt);
    el.value = value;
  }
}

/** Switch the applicant modal tab */
/* ── Helper: get/set multi-assignees from checkbox list ── */
function _getAssignees() {
  return Array.from(
    document.querySelectorAll(
      "#assignee-checkbox-list input[name='f-assignees']:checked",
    ),
  ).map((cb) => cb.value);
}
function _setAssignees(arr) {
  document
    .querySelectorAll("#assignee-checkbox-list input[name='f-assignees']")
    .forEach((cb) => {
      cb.checked = arr.includes(cb.value);
    });
  _updateAssigneeDropdownLabel();
}
function _updateAssigneeDropdownLabel() {
  const selected = _getAssignees();
  const label = document.getElementById("assignee-dropdown-label");
  if (!label) return;
  if (selected.length === 0) label.textContent = "— None —";
  else if (selected.length === 1) label.textContent = selected[0];
  else label.textContent = `${selected[0]} +${selected.length - 1} more`;
}

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
  // Render activity/files/history tabs on switch
  if (tabName === "activity" || tabName === "files" || tabName === "history") {
    const task = taskEditId ? TASKS.find((x) => x.id === taskEditId) : null;
    if (task && tabName === "activity") renderActivityTab(task);
    if (task && tabName === "files") renderFilesTab(task);
    if (task && tabName === "history") renderHistoryTab(task);
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
  const btnMove = document.getElementById("btn-move-stage");
  if (!strip) return;

  // Hide Assessment tab for early stages where it hasn't happened yet
  const assessTab = document.querySelector('.modal-tab[data-tab="assessment"]');
  const HIDE_ASSESS_STAGES = ["New"];
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

  if (!taskId) {
    strip.style.display = "none";
    return;
  }

  // For terminal stages, show only the delete button
  if (TERMINAL_STAGES.includes(status)) {
    strip.style.display = "flex";
    if (btnNext) btnNext.style.display = "none";
    if (btnHire) btnHire.style.display = "none";
    if (btnRej) btnRej.style.display = "none";
    if (btnMove) btnMove.style.display = "none";
    return;
  }

  const next = getNextStage(status);
  strip.style.display = "flex";
  if (btnNext) {
    btnNext.textContent = next ? `→ ${next}` : "✓ Final Stage";
    btnNext.style.display = next ? "inline-flex" : "none";
  }
  if (btnHire)
    btnHire.style.display = status === "Endorsed" ? "inline-flex" : "none";
  if (btnRej) btnRej.style.display = "inline-flex";

  // Populate "Move to" dropdown with all non-terminal stages except the current one
  if (btnMove) {
    const moveable = STAGE_ORDER.filter(
      (s) => s !== status && !TERMINAL_STAGES.includes(s),
    );
    if (moveable.length > 0) {
      btnMove.innerHTML =
        `<option value="">⤸ Move to...</option>` +
        moveable.map((s) => `<option value="${s}">${s}</option>`).join("");
      btnMove.style.display = "";
    } else {
      btnMove.style.display = "none";
    }
  }
}

/** Refresh the score summary card in the assessment tab */
function _refreshScoreSummary() {
  const card = document.getElementById("score-summary");
  if (!card) return;

  const typing    = document.getElementById("f-typing-score")?.value?.trim();
  const wordTyping= document.getElementById("f-word-typing")?.value?.trim();
  const knowledge = document.getElementById("f-knowledge-score")?.value?.trim();
  const verbal    = document.getElementById("f-verbal-link")?.value?.trim();
  const conflict  = document.getElementById("f-conflict-score")?.value?.trim();
  const grammar   = document.getElementById("f-grammar-score")?.value?.trim();
  const dataEntry = document.getElementById("f-data-entry-score")?.value?.trim();
  const formatting= document.getElementById("f-formatting-score")?.value?.trim();
  const sorting   = document.getElementById("f-sorting-score")?.value?.trim();
  const notes     = document.getElementById("f-interview-notes")?.value?.trim();

  const hasTyping  = typing || wordTyping || knowledge;
  const hasVerbal  = verbal || conflict || grammar;
  const hasExcel   = dataEntry || formatting || sorting;
  const hasAny     = hasTyping || hasVerbal || hasExcel || notes;

  if (!hasAny) { card.style.display = "none"; return; }
  card.style.display = "block";

  function _scoreRow(label, val, outOf, threshold) {
    if (!val) return "";
    const num = parseFloat(val);
    const hasPass = threshold !== undefined && !isNaN(num);
    const passed  = hasPass && num >= threshold;
    const pill    = hasPass
      ? `<span style="font-size:10px;font-weight:800;font-family:'Montserrat',sans-serif;padding:2px 8px;border-radius:99px;background:${passed ? "rgba(67,233,123,.12)" : "rgba(239,68,68,.1)"};color:${passed ? "var(--green)" : "#ef4444"};">${passed ? "✓ PASS" : "✗ FAIL"}</span>`
      : "";
    const display = outOf ? `${val}/${outOf}` : val;
    return `<div class="score-item"><span class="score-label">${label}</span><span class="score-val" style="display:flex;align-items:center;gap:6px;">${display}${pill}</span></div>`;
  }

  function _categoryBlock(icon, title, rows) {
    const content = rows.join("");
    if (!content) return "";
    return `
      <div class="score-category">
        <div class="score-category-title">${icon} ${title}</div>
        <div class="score-summary-grid">${content}</div>
      </div>`;
  }

  card.innerHTML = `
    <div class="score-summary-title">📊 Score Summary</div>
    ${_categoryBlock("⌨️", "Typing Test", [
      _scoreRow("Typing Assessment", typing, null, 40),
      _scoreRow("Word Typing", wordTyping, null, 40),
      _scoreRow("Knowledge Test", knowledge, 100, 75),
    ])}
    ${_categoryBlock("🎙️", "Verbal Test", [
      verbal ? `<div class="score-item"><span class="score-label">Verbal Comm</span><a href="${verbal}" target="_blank" class="score-val" style="color:var(--cyan);">View Recording</a></div>` : "",
      _scoreRow("Conflict Reso", conflict, 20, 15),
      _scoreRow("Grammar Test", grammar, 20, 15),
    ])}
    ${_categoryBlock("📊", "Excel Test", [
      _scoreRow("Data Entry", dataEntry),
      _scoreRow("Formatting", formatting),
      _scoreRow("Sorting", sorting),
    ])}
    ${notes ? `<div class="score-category"><div class="score-category-title">💬 Interview Notes</div><div class="score-summary-grid"><div class="score-item score-item-full"><span class="score-val" style="font-weight:400;color:var(--muted);font-size:12px;">${notes.slice(0, 120)}${notes.length > 120 ? "…" : ""}</span></div></div></div>` : ""}
  `;

  ["f-typing-score","f-word-typing","f-knowledge-score","f-conflict-score","f-grammar-score","f-data-entry-score","f-formatting-score","f-sorting-score"].forEach((id) => {
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
const ASSESSMENT_PORTAL_URL = "https://f--asessment-portal.web.app/";

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
 * Matches by email first, then by name (normalized).
 */
function _normName(s) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}
function _namesMatch(a, b) {
  const na = _normName(a);
  const nb = _normName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const pa = na.split(" ");
  const pb = nb.split(" ");
  return pa[0] === pb[0] && pa[pa.length - 1] === pb[pb.length - 1];
}
function _matchPendingResult(task) {
  const pending = _loadPendingAssessments();
  if (!pending.length) return null;
  const email = (task.applicant_email || "").toLowerCase().trim();
  const name = task.applicant_name || task.name || "";
  return (
    pending.find((r) => {
      if (email && r.email && r.email.toLowerCase().trim() === email)
        return true;
      if (name && r.name && _namesMatch(name, r.name)) return true;
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
// ── Assessment tab switcher ──────────────────────────────────────────────────
function initAssessTabs() {
  const bar = document.getElementById("assess-tab-bar");
  if (!bar) return;
  bar.querySelectorAll(".assess-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Deactivate all tabs and hide all panels
      bar.querySelectorAll(".assess-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".assess-panel").forEach((p) => (p.style.display = "none"));
      // Activate clicked tab and show its panel
      btn.classList.add("active");
      const panel = document.getElementById(btn.dataset.target);
      if (panel) panel.style.display = "";
    });
  });
}
// Run once on page load
document.addEventListener("DOMContentLoaded", initAssessTabs);

function _resetAssessTabs() {
  const bar = document.getElementById("assess-tab-bar");
  if (!bar) return;
  bar.querySelectorAll(".assess-tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".assess-panel").forEach((p) => (p.style.display = "none"));
  const first = bar.querySelector(".assess-tab");
  if (first) {
    first.classList.add("active");
    const panel = document.getElementById(first.dataset.target);
    if (panel) panel.style.display = "";
  }
}

function applyPendingAssessment() {
  const task = taskEditId ? TASKS.find((x) => x.id === taskEditId) : null;
  if (!task) return;

  try {
    const raw = localStorage.getItem(ASSESSMENT_PORTAL_LS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const email = (task.applicant_email || "").toLowerCase().trim();
    const name = task.applicant_name || task.name || "";

    const idx = list.findIndex(
      (r) =>
        (email && r.email && r.email.toLowerCase().trim() === email) ||
        (name && r.name && _namesMatch(name, r.name)),
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
    // Typing Test
    _fill("f-typing-score",    r.typing_score    || "");
    _fill("f-word-typing",     r.word_typing      || "");
    _fill("f-knowledge-score", r.knowledge_score || "");
    // Verbal Test
    _fill("f-verbal-link",     r.verbal_link     || "");
    _fill("f-conflict-score",  r.conflict_score  || "");
    _fill("f-grammar-score",   r.grammar_score   || "");
    // Excel Test
    _fill("f-data-entry-score",  r.data_entry_score  || "");
    _fill("f-formatting-score",  r.formatting_score  || "");
    _fill("f-sorting-score",     r.sorting_score     || "");
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

/* ── Load / Save GCal API config from localStorage ── */
function loadGCalApiConfig() {
  try {
    return JSON.parse(localStorage.getItem("upstaff_gcal_api_config") || "{}");
  } catch (_) { return {}; }
}

window.saveGCalApiConfig = function saveGCalApiConfig() {
  const config = {
    apiKey:   document.getElementById("s-gcal-api-key")?.value.trim()   || "",
    clientId: document.getElementById("s-gcal-client-id")?.value.trim() || "",
  };
  localStorage.setItem("upstaff_gcal_api_config", JSON.stringify(config));
  if (typeof GCAL_CONFIG !== "undefined") {
    GCAL_CONFIG.API_KEY   = config.apiKey;
    GCAL_CONFIG.CLIENT_ID = config.clientId;
    if (config.apiKey && config.clientId && typeof gcalInit === "function") gcalInit();
  }
  showToast("✅ Google Calendar credentials saved.");
};

function populateGCalApiSettings() {
  const c = loadGCalApiConfig();
  const apiEl = document.getElementById("s-gcal-api-key");
  const cidEl = document.getElementById("s-gcal-client-id");
  if (apiEl) apiEl.value = c.apiKey   || "";
  if (cidEl) cidEl.value = c.clientId || "";
}

/* ── Load / Save EmailJS config from localStorage ── */
const EMAILJS_DEFAULTS = {
  serviceId: "",
  templateId: "",
  publicKey: "",
  portalUrl: "https://f--asessment-portal.web.app/",
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

/* ══════════════════════════════════════════════
   PARTNER API — Config UI + Sync
══════════════════════════════════════════════ */

function saveApiConfig() {
  // No-op — URL/email/password are now hardcoded in pm-ui-api.js
}

/* ══════════════════════════════════════════════
   AVATAR MENU + LOGOUT
══════════════════════════════════════════════ */

function toggleAvatarMenu() {
  const menu = document.getElementById("avatar-menu");
  if (!menu) return;
  const isOpen = menu.style.display !== "none";
  menu.style.display = isOpen ? "none" : "block";

  // Update labels from profile + API config
  if (!isOpen) {
    const profile = (() => {
      try {
        return JSON.parse(localStorage.getItem("upstaff_profile") || "{}");
      } catch {
        return {};
      }
    })();
    const nameLbl = document.getElementById("avatar-name-label");
    const emailLbl = document.getElementById("avatar-email-label");
    if (nameLbl && (profile.firstName || profile.lastName))
      nameLbl.textContent = [profile.firstName, profile.lastName]
        .filter(Boolean)
        .join(" ");
    if (emailLbl) {
      const apiCfg = window.UpstaffAPI ? UpstaffAPI.getConfig() : {};
      emailLbl.textContent = apiCfg.email || profile.email || "Not connected";
    }
  }

  // Close when clicking outside
  if (!isOpen) {
    setTimeout(() => {
      document.addEventListener("click", _closeAvatarMenu, { once: true });
    }, 0);
  }
}

function _closeAvatarMenu(e) {
  const wrapper = document.getElementById("avatar-wrapper");
  if (wrapper && !wrapper.contains(e.target)) {
    const menu = document.getElementById("avatar-menu");
    if (menu) menu.style.display = "none";
  }
}

async function handleLogout() {
  const menu = document.getElementById("avatar-menu");
  if (menu) menu.style.display = "none";

  const confirmed = await uiConfirm(
    "Are you sure you want to log out? Your local data will stay saved.",
    { icon: "⚠️", title: "Log Out", okText: "Log Out" },
  );
  if (!confirmed) return;

  // Clear API token
  if (window.UpstaffAPI) UpstaffAPI.logout();

  // Clear Google Calendar auth
  if (typeof getUserGcalAuthKey === "function") {
    localStorage.removeItem(getUserGcalAuthKey());
  }

  showToast("Logged out.");

  // Reload after short delay so toast is visible
  setTimeout(() => location.reload(), 800);
}

function populateApiSettings() {
  const cfg = UpstaffAPI.getConfig();

  // Populate credential fields
  const urlEl = document.getElementById("api-cred-url");
  const emailEl = document.getElementById("api-cred-email");
  const passEl = document.getElementById("api-cred-password");
  if (urlEl) urlEl.value = cfg.webAppUrl || "";
  if (emailEl) emailEl.value = cfg.adminEmail || "";
  if (passEl) passEl.value = cfg.adminPassword || "";

  const loggedInEl = document.getElementById("api-logged-in-as");
  if (loggedInEl) {
    loggedInEl.textContent = cfg.name
      ? `${cfg.name} (${cfg.email}) — ${cfg.role === "hr" ? "HR" : "Assistant"}`
      : "Not signed in";
  }

  const statusEl = document.getElementById("api-status-text");
  if (statusEl) {
    statusEl.textContent = cfg.token ? "Connected ✅" : "Not connected";
    statusEl.style.color = cfg.token ? "var(--green)" : "";
  }
}

window.saveApiCredentials = function () {
  const url = (document.getElementById("api-cred-url")?.value || "").trim();
  const email = (document.getElementById("api-cred-email")?.value || "").trim();
  const password = (
    document.getElementById("api-cred-password")?.value || ""
  ).trim();
  const statusEl = document.getElementById("api-cred-status");

  if (
    !url ||
    !url.startsWith("https://script.google.com/macros/s/") ||
    !url.endsWith("/exec")
  ) {
    statusEl.textContent =
      "❌ Invalid URL — must be a valid Apps Script /exec URL.";
    statusEl.style.color = "#ef4444";
    return;
  }
  if (!email) {
    statusEl.textContent = "❌ ADMIN_EMAIL is required.";
    statusEl.style.color = "#ef4444";
    return;
  }
  if (!password) {
    statusEl.textContent = "❌ ADMIN_PASSWORD is required.";
    statusEl.style.color = "#ef4444";
    return;
  }

  const cfg = UpstaffAPI.getConfig();
  cfg.webAppUrl = url;
  cfg.adminEmail = email;
  cfg.adminPassword = password;
  UpstaffAPI.saveConfig(cfg);

  statusEl.textContent =
    "✅ Credentials saved. Sign in with Google to connect.";
  statusEl.style.color = "var(--green,#10b981)";
};

window.toggleApiPasswordVisibility = function () {
  const input = document.getElementById("api-cred-password");
  if (input) input.type = input.type === "password" ? "text" : "password";
};

let _syncInProgress = false;
async function syncApplicantsFromApi(opts) {
  if (_syncInProgress) return;
  if (!window.UpstaffAPI || !UpstaffAPI.isConfigured()) return;
  const silent = opts && opts.silent;
  _syncInProgress = true;

  try {
    if (!silent) showToast("Syncing applicants…");
    const res = await UpstaffAPI.getApplicants({ limit: 500 });
    if (!res.data || !res.data.length) {
      // Clear any stale API-sourced tasks so they don't linger after being removed from the sheet
      const hadApiTasks = TASKS.some((t) => t._source === "api");
      const localOnly = TASKS.filter((t) => t._source !== "api");
      TASKS.length = 0;
      localOnly.forEach((t) => TASKS.push(t));
      if (hadApiTasks) {
        persistSave();
        refreshCurrentView();
      }
      if (!silent) showToast("No applicants found in database.");
      return;
    }

    // Remove previously API-sourced tasks and re-import fresh
    const localTasks = TASKS.filter((t) => t._source !== "api");
    const prevCount = TASKS.filter((t) => t._source === "api").length;

    // Assign local IDs starting after existing max
    const existingApiTasks = TASKS.filter((t) => t._source === "api");
    let nextId = Math.max(taskNextId, ...TASKS.map((t) => t.id || 0)) + 1;
    const apiTasks = res.data.map((r) => {
      const mapped = UpstaffAPI.mapApplicant(r, nextId++);

      // Preserve the local dashboard stage if the partner status hasn't changed
      // externally. This prevents the sync from overwriting finer-grained local
      // stages (e.g. "Screening") that map to the same coarse partner status
      // (e.g. "For Interview").
      const existing = existingApiTasks.find((t) =>
        (t.supabase_id && t.supabase_id === mapped.supabase_id) ||
        (t.applicant_email && t.applicant_email === (mapped.applicant_email || "").toLowerCase())
      );
      if (existing) {
        if (existing.partner_status === mapped.partner_status) {
          // Partner status unchanged — keep the user's local dashboard stage
          mapped.status = existing.status;
        }
        // Always preserve assessment state — these fields live only in localStorage
        const assessFields = [
          "assess_token", "assess_sent_at", "assess_completed",
          "assess_completed_at", "assess_score", "assess_result",
          "typing_score", "word_typing_score", "knowledge_score",
          "verbal_link", "conflict_score", "grammar_score",
          "data_entry_score", "formatting_score", "sorting_score",
          "gcalEventId", "google_event_id",
          "activity", "attachments", "stage_history", "comments",
        ];
        assessFields.forEach((f) => {
          if (existing[f] !== undefined) mapped[f] = existing[f];
        });
      }

      return mapped;
    });

    // Deduplicate: drop local tasks that match an API record by supabase_id OR by email.
    // Email fallback catches cases where addApplicant appeared to fail in JS but
    // actually succeeded on the server — so supabase_id was never captured locally.
    const apiIds = new Set(apiTasks.map((t) => t.supabase_id).filter(Boolean));
    const apiEmails = new Set(
      apiTasks
        .map((t) => (t.applicant_email || "").toLowerCase())
        .filter(Boolean),
    );
    const dedupedLocal = localTasks.filter((t) => {
      if (t.supabase_id && apiIds.has(t.supabase_id)) return false;
      if (t.applicant_email && apiEmails.has(t.applicant_email.toLowerCase()))
        return false;
      return true;
    });

    TASKS.length = 0;
    dedupedLocal.forEach((t) => TASKS.push(t));
    apiTasks.forEach((t) => TASKS.push(t));
    taskNextId = nextId;

    // Auto-create onboarding records for any hired applicants that don't have one yet
    apiTasks.forEach((t) => {
      if (t.status === "Hired" && typeof _autoCreateEmployee === "function") {
        _autoCreateEmployee(t);
      }
    });

    persistSave();

    // Inject interview_slots from sheet data as calendar events
    // so they appear on the calendar and count in analytics
    if (typeof injectInterviewSlotsAsEvents === "function") {
      injectInterviewSlotsAsEvents(TASKS);
    }

    refreshCurrentView();

    const newCount = apiTasks.length - prevCount;
    if (silent) {
      // Only notify if there are new applicants since last sync
      if (newCount > 0)
        showToast(`🔄 ${newCount} new applicant${newCount > 1 ? "s" : ""} synced.`);
    } else {
      showToast(`✅ Synced ${apiTasks.length} applicants from database.`);
    }

    // Update GCal events for tasks that already have a linked event
    if (typeof gcalSignedIn !== "undefined" && gcalSignedIn &&
        typeof _taskSyncToGcal === "function") {
      TASKS.filter((t) => t.gcalEventId).forEach((t) => {
        _taskSyncToGcal(t).catch(() => {});
      });
    }
  } catch (e) {
    if (!silent) showToast("❌ Sync failed: " + e.message);
    console.error("[API Sync]", e);
  } finally {
    _syncInProgress = false;
  }
}

// ── Auto-sync every 60 seconds (silent background pull) ──────────────────────
(function _startAutoSync() {
  setInterval(function () {
    syncApplicantsFromApi({ silent: true });
    checkFollowUpReminders();
  }, 60 * 1000);
})();

/* ── Follow-up reminder check ─────────────────────────────────────────────────
   Runs on load + every auto-sync. Notifies once per day per task.
────────────────────────────────────────────── */
function checkFollowUpReminders() {
  const today = new Date().toISOString().slice(0, 10);
  let any = false;
  TASKS.forEach((t) => {
    if (!t.followup_date) return;
    if (t.followup_date > today) return; // not due yet
    if (t.followup_notified === today) return; // already notified today
    if (TERMINAL_STAGES.includes(t.status)) return; // hired/closed — skip
    const name = t.applicant_name || t.name || "an applicant";
    const overdue = t.followup_date < today;
    pushNotif(
      "reminder",
      `${overdue ? "⚠️ Overdue" : "📌 Follow up"}: ${name} (${t.position || t.status})`,
      t.id,
    );
    t.followup_notified = today;
    any = true;
  });
  if (any) persistSave();
}
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(checkFollowUpReminders, 2000); // slight delay so TASKS are loaded
});

/* ══════════════════════════════════════════════
   JOBS VIEW
══════════════════════════════════════════════ */

async function loadJobsView() {
  const el = document.getElementById("jobs-list");
  if (!el) return;

  if (!window.UpstaffAPI || !UpstaffAPI.isConfigured()) {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px">
      Connect to the partner API first in <strong>Settings → Partner API</strong>.
    </div>`;
    return;
  }

  el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px">Loading…</div>`;

  try {
    const res = await UpstaffAPI.getJobs();
    const jobs = res.data || [];

    if (!jobs.length) {
      el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px">No jobs found.</div>`;
      return;
    }

    el.innerHTML = jobs
      .map(
        (job) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:var(--surface-1);border:1px solid var(--border);border-radius:10px">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${job.active ? "var(--green)" : "#9ca3af"}"></span>
          <span style="font-size:14px;font-weight:600;color:var(--text)">${sanitize(job.title)}</span>
          <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${job.active ? "#dcfce7" : "#f1f5f9"};color:${job.active ? "#16a34a" : "#64748b"};font-weight:600">
            ${job.active ? "Active" : "Inactive"}
          </span>
        </div>
        <button
          onclick="toggleJobItem(${job.index})"
          style="font-size:11px;padding:5px 12px;border-radius:7px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);cursor:pointer;font-weight:600"
        >${job.active ? "Deactivate" : "Activate"}</button>
      </div>
    `,
      )
      .join("");
  } catch (e) {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--red,#ef4444);font-size:13px">Failed to load jobs: ${sanitize(e.message)}</div>`;
  }
}

async function toggleJobItem(index) {
  try {
    await UpstaffAPI.toggleJob(index);
    await loadJobsView();
  } catch (e) {
    showToast("❌ Failed to toggle job: " + e.message);
  }
}

function openAddJobModal() {
  const title = prompt("Enter job title:");
  if (!title || !title.trim()) return;
  addJobItem(title.trim());
}

async function addJobItem(title) {
  if (!window.UpstaffAPI || !UpstaffAPI.isConfigured()) {
    showToast("Connect to partner API first.");
    return;
  }
  try {
    await UpstaffAPI.addJob(title);
    showToast("✅ Job added!");
    await loadJobsView();
  } catch (e) {
    showToast("❌ Failed to add job: " + e.message);
  }
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
  const base = config.portalUrl || "https://f--asessment-portal.web.app/";
  const email = encodeURIComponent(task.applicant_email || "");
  const name = encodeURIComponent(task.applicant_name || task.name || "");
  return `${base}?token=${token}&email=${email}&name=${name}`;
}

/* ── Update the invite status UI inside the Assessment tab ── */
function _refreshAssessInviteUI(task) {
  const badge     = document.getElementById("assess-status-badge");
  const meta      = document.getElementById("assess-status-meta");
  const sendBtn   = document.getElementById("assess-send-btn");
  const resendBtn = document.getElementById("assess-resend-btn");
  const resetBtn  = document.getElementById("assess-reset-btn");
  const noteEl    = document.getElementById("assess-invite-note");
  const copyBtn   = document.getElementById("assess-copy-btn");
  const warnEl    = document.getElementById("assess-no-email-warn");
  if (!badge) return;

  const hasEmail = !!(task.applicant_email || "").trim();

  function _setSendControls(showSend, showResend) {
    if (hasEmail) {
      if (sendBtn)   sendBtn.style.display   = showSend   ? "inline-flex" : "none";
      if (resendBtn) resendBtn.style.display = showResend ? "inline-flex" : "none";
      if (copyBtn)   copyBtn.style.display   = "none";
      if (warnEl)    warnEl.style.display    = "none";
    } else {
      if (sendBtn)   sendBtn.style.display   = "none";
      if (resendBtn) resendBtn.style.display = "none";
      if (copyBtn)   copyBtn.style.display   = (showSend || showResend) ? "inline-flex" : "none";
      if (warnEl)    warnEl.style.display    = "block";
    }
  }

  const config = loadEmailJSConfig();
  const expHrs = config.expiryHours || 72;

  if (task.assess_completed) {
    badge.className = "assess-status-badge completed";
    badge.textContent = "✔ Completed";
    if (meta) meta.textContent = task.assess_completed_at
      ? "Completed on " +
        new Date(task.assess_completed_at).toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";
    _setSendControls(false, false);
    if (resetBtn) resetBtn.style.display = "inline-flex";
    if (noteEl) noteEl.textContent =
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
    if (meta) meta.textContent =
      "Sent " +
      sentDate.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    _setSendControls(false, true);
    if (resetBtn) resetBtn.style.display = "inline-flex";
    if (noteEl) noteEl.textContent = expired
      ? `Link expired after ${expHrs}h. Click ${hasEmail ? "Resend" : "Copy Link"} to generate a new one.`
      : `Link expires ${expiresAt.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} at ${expiresAt.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}.`;
    return;
  }

  // Not sent yet
  badge.className = "assess-status-badge not-sent";
  badge.textContent = "● Not Sent";
  if (meta) meta.textContent = "";
  _setSendControls(true, false);
  if (resetBtn) resetBtn.style.display = "none";
  if (noteEl) noteEl.textContent = hasEmail
    ? "Send an assessment invitation email to the applicant."
    : "Generate a link and share it with the applicant directly.";
}

/* ── Core send function (used by both Send and Resend) ── */
async function _doSendAssessmentEmail(isResend = false) {
  const taskId = taskEditId || window._editingTaskId;
  if (!taskId) {
    showToast("⚠️ No applicant selected.");
    return;
  }
  const task = TASKS.find((t) => t.id === taskId);
  if (!task) {
    showToast("⚠️ Applicant not found.");
    return;
  }
  if (!task.applicant_email) {
    showToast("⚠️ No email address on file for this applicant.");
    return;
  }

  const noteEl = document.getElementById("assess-invite-note");
  if (noteEl) noteEl.textContent = isResend ? "Resending…" : "Sending…";
  showToast(
    isResend
      ? "⏳ Resending assessment link…"
      : "⏳ Sending assessment invitation…",
  );

  const _sendBtn = document.getElementById("assess-send-btn");
  const _resendBtn = document.getElementById("assess-resend-btn");
  if (_sendBtn) _sendBtn.disabled = true;
  if (_resendBtn) _resendBtn.disabled = true;

  try {
    const token = generateAssessToken();
    const link = buildAssessmentLink(task, token);
    const firstName = (task.applicant_name || task.name || "Applicant").split(
      " ",
    )[0];
    const position = task.position || "the role";

    let hrName = "HR Team";
    try {
      const p = JSON.parse(localStorage.getItem("upstaff_profile") || "{}");
      hrName = [p.firstName, p.lastName].filter(Boolean).join(" ") || hrName;
    } catch (e) {}

    const subject = `Your Assessment Invitation – ${position} at Upstaff`;
    const logoUrl = "https://upstaff.netlify.app/css/logo-footer.png";
    const body = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body{margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);}
  .hdr{background:#1a1f35;padding:28px 40px;text-align:center;}
  .hdr img{height:40px;}
  .bod{padding:40px;color:#1e293b;font-size:15px;line-height:1.7;}
  .bod h2{margin:0 0 20px;font-size:20px;color:#1a1f35;}
  .bod p{margin:0 0 16px;}
  .btn-wrap{text-align:center;margin:28px 0;}
  .btn{display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3ecfdf,#6ee7ef);color:#0f1629!important;font-weight:700;font-size:15px;border-radius:10px;text-decoration:none;}
  .foot{background:#f8fafc;padding:24px 40px;text-align:center;font-size:12px;color:#94a3b8;}
  .foot a{color:#3ecfdf;text-decoration:none;}
  hr{border:none;border-top:1px solid #e2e8f0;margin:28px 0;}
</style></head><body>
<div class="wrap">
  <div class="hdr"><img src="${logoUrl}" alt="Upstaff"/></div>
  <div class="bod">
    <h2>You've Been Invited to Take an Assessment!</h2>
    <p>Hi <strong>${firstName}</strong>,</p>
    <p>As part of the application process for the <strong>${position}</strong> role at Upstaff, we'd like you to complete a short online assessment.</p>
    <p>It should take approximately <strong>15–20 minutes</strong>. Please finish it at your earliest convenience.</p>
    <div class="btn-wrap"><a href="${link}" class="btn">Start Assessment →</a></div>
    <p style="font-size:13px;color:#94a3b8;text-align:center;">Or copy this link:<br><a href="${link}" style="color:#3ecfdf;">${link}</a></p>
    <hr>
    <p>If you have any questions, feel free to reply to this email.</p>
    <p>Best regards,<br><strong>${hrName}</strong><br>Upstaff HR Team</p>
  </div>
  <div class="foot"><p>© ${new Date().getFullYear()} Upstaff &nbsp;·&nbsp; <a href="https://upstaff.netlify.app">upstaff.netlify.app</a></p></div>
</div></body></html>`;

    const ejsConfig = loadEmailJSConfig();
    if (!ejsConfig.serviceId || !ejsConfig.templateId || !ejsConfig.publicKey) {
      throw new Error("EmailJS not configured. Go to Settings → EmailJS and fill in Service ID, Template ID, and Public Key.");
    }
    await emailjs.send(
      ejsConfig.serviceId,
      ejsConfig.templateId,
      {
        to_email:      task.applicant_email,
        first_name:    firstName,
        from_name:     hrName,
        subject:       subject,
        website_link:  link,
        position:      position,
        company_name:  "Upstaff",
        company_email: "hr@upstaff.com",
      },
      ejsConfig.publicKey
    );

    task.assess_token = token;
    task.assess_sent_at = new Date().toISOString();
    task.assess_completed = false;
    task.assess_completed_at = null;
    persistSave();
    _refreshAssessInviteUI(task);

    if (noteEl)
      noteEl.textContent = isResend ? "✅ Link resent!" : "✅ Invitation sent!";
    showToast(
      isResend
        ? "✅ Assessment link resent!"
        : "✅ Assessment invitation sent!",
    );
  } catch (err) {
    // EmailJS errors: err.status (HTTP code) + err.text (reason string)
    const ejsStatus = err?.status;
    const ejsText   = err?.text || err?.message || JSON.stringify(err) || "Unknown error";
    console.error("[Assessment Email] EmailJS error:", ejsStatus, ejsText, err);
    let userMsg;
    if (ejsStatus === 400) {
      userMsg = `❌ EmailJS rejected the request (400): ${ejsText}. Check that your Service ID, Template ID, and Public Key in Settings → EmailJS are correct, and that your template variables match.`;
    } else if (ejsStatus === 401 || ejsStatus === 403) {
      userMsg = `❌ EmailJS authentication failed (${ejsStatus}): invalid Public Key or account suspended.`;
    } else {
      userMsg = `❌ Email failed: ${ejsText}`;
    }
    if (noteEl) noteEl.textContent = userMsg;
    showToast(userMsg);
  } finally {
    if (_sendBtn) _sendBtn.disabled = false;
    if (_resendBtn) _resendBtn.disabled = false;
  }
}

function sendAssessmentEmail() {
  _doSendAssessmentEmail(false);
}
function resendAssessmentEmail() {
  _doSendAssessmentEmail(true);
}
async function copyAssessmentLink() {
  const taskId = taskEditId || window._editingTaskId;
  if (!taskId) return;
  const task = TASKS.find((t) => t.id === taskId);
  if (!task) return;

  const copyBtn = document.getElementById("assess-copy-btn");
  if (copyBtn) copyBtn.disabled = true;

  try {
    const token = generateAssessToken();
    const link = buildAssessmentLink(task, token);

    task.assess_token = token;
    task.assess_sent_at = new Date().toISOString();
    task.assess_completed = false;
    task.assess_completed_at = null;
    persistSave();
    _refreshAssessInviteUI(task);

    try {
      await navigator.clipboard.writeText(link);
      showToast("✅ Assessment link copied! Share it with the applicant.");
    } catch {
      prompt("Copy this assessment link:", link);
    }

    const noteEl = document.getElementById("assess-invite-note");
    if (noteEl) noteEl.textContent = "✅ Link copied! Share it with the applicant.";
  } finally {
    const btn = document.getElementById("assess-copy-btn");
    if (btn) btn.disabled = false;
  }
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
   SMART LINK CARDS — platform detection & UI
══════════════════════════════════════════════ */
function _detectLinkPlatform(url) {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes("drive.google.com/drive/folders"))
    return { label: "📁 Google Drive · Folder", cls: "link-badge-drive" };
  if (u.includes("drive.google.com"))
    return { label: "📄 Google Drive", cls: "link-badge-drive" };
  if (u.includes("dropbox.com"))
    return { label: "📦 Dropbox", cls: "link-badge-dropbox" };
  if (u.includes("onedrive.live.com") || u.includes("1drv.ms"))
    return { label: "☁️ OneDrive", cls: "link-badge-onedrive" };
  if (u.includes("behance.net"))
    return { label: "🎨 Behance", cls: "link-badge-behance" };
  if (u.includes("linkedin.com"))
    return { label: "💼 LinkedIn", cls: "link-badge-linkedin" };
  if (u.includes("github.com"))
    return { label: "🐙 GitHub", cls: "link-badge-github" };
  if (u.includes("notion.so"))
    return { label: "📝 Notion", cls: "link-badge-notion" };
  if (u.startsWith("http"))
    return { label: "🔗 External Link", cls: "link-badge-generic" };
  return null;
}

function _updateLinkCard(inputId, cardId) {
  const input = document.getElementById(inputId);
  const badge = document.getElementById(cardId + "-badge");
  const btnCopy = document.getElementById(cardId + "-copy");
  const btnOpen = document.getElementById(cardId + "-open");
  if (!input || !badge) return;

  const url = input.value.trim();
  const info = url ? _detectLinkPlatform(url) : null;

  if (info) {
    badge.textContent = info.label;
    badge.className = "link-card-badge " + info.cls;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
    badge.className = "link-card-badge";
  }

  if (btnCopy) {
    btnCopy.style.display = url ? "inline-flex" : "none";
    btnCopy.onclick = () => {
      if (navigator.clipboard) {
        navigator.clipboard
          .writeText(url)
          .then(() => showToast("📋 Link copied!"));
      }
    };
  }
  if (btnOpen) {
    btnOpen.style.display = url ? "inline-flex" : "none";
    btnOpen.onclick = () => {
      if (url) window.open(url, "_blank", "noopener");
    };
  }
}

// Wire up live detection on the 3 profile link fields
(function _initLinkCards() {
  const cards = [
    { input: "f-resume", card: "lc-resume" },
    { input: "f-portfolio", card: "lc-portfolio" },
    { input: "f-drive-folder", card: "lc-drive-folder" },
  ];
  cards.forEach(({ input, card }) => {
    const el = document.getElementById(input);
    if (el) el.addEventListener("input", () => _updateLinkCard(input, card));
  });
})();

/* ══════════════════════════════════════════════
   [SECTION: MODAL-OPEN] — Task/Applicant Modal
══════════════════════════════════════════════ */
function _setModalAvatar(name, status) {
  const av = document.getElementById("task-modal-avatar");
  const sh = document.getElementById("task-modal-subhead");
  if (av) {
    const parts = (name || "NA").split(" ").filter(Boolean);
    const ini = (parts[0]?.[0] || "") + (parts[1]?.[0] || parts[0]?.[1] || "");
    av.textContent = ini.toUpperCase() || "?";
    av.style.background = avatarColor(name || "NA");
  }
  if (sh && status) {
    const sm = STATUS_META[status] || {};
    sh.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;background:${sm.bg||'var(--surface-3)'};color:${sm.color||'var(--muted)'};">${status}</span>`;
  } else if (sh) {
    sh.innerHTML = "";
  }
}

function openTaskNew(status = "New") {
  taskEditId = null;
  document.getElementById("task-modal-heading").textContent = "New Applicant";
  _setModalAvatar("New Applicant", status);
  document.getElementById("f-name").value = "";
  document.getElementById("f-status").value = status;
  document.getElementById("f-priority").value = "Medium";
  document.getElementById("f-position").value = "Intake Caller";
  _rebuildAssigneeOptions();
  _setAssignees(["Assistant"]);
  document.getElementById("f-start").value = new Date()
    .toISOString()
    .slice(0, 10);
  document.getElementById("f-due").value = "";
  document.getElementById("f-notes").value = "";
  _notesPreviewUpdate("");
  document.getElementById("f-folder").value = "";
  // Applicant profile fields
  _setField("f-email", "");
  _setField("f-phone", "");
  _setField("f-address", "");
  _setField("f-employment-type", "");
  _setField("f-work-setup", "");
  _setField("f-work-schedule", "");
  _setField("f-education-level", "");
  _setField("f-school", "");
  _setField("f-course", "");
  _setField("f-skills", "");
  _setField("f-tools", "");
  _setField("f-interview-slots", "");
  _setField("f-referral-source", "");
  _setField("f-resume", "");
  _setField("f-portfolio", "");
  _setField("f-video-intro", "");
  _setField("f-other-docs", "");
  _setField("f-drive-folder", "");
  _updateLinkCard("f-resume", "lc-resume");
  _updateLinkCard("f-portfolio", "lc-portfolio");
  _updateLinkCard("f-video-intro", "lc-video-intro");
  _updateLinkCard("f-other-docs", "lc-other-docs");
  _updateLinkCard("f-drive-folder", "lc-drive-folder");
  _setField("f-app-date", new Date().toISOString().slice(0, 10));
  _setField("f-followup-date", "");
  // Reset assessment tabs to first tab (Typing)
  _resetAssessTabs();
  // Assessment fields
  _setField("f-typing-score", "");
  _setField("f-word-typing", "");
  _setField("f-knowledge-score", "");
  _setField("f-verbal-link", "");
  _setField("f-conflict-score", "");
  _setField("f-grammar-score", "");
  _setField("f-data-entry-score", "");
  _setField("f-formatting-score", "");
  _setField("f-sorting-score", "");
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
  _gsapModalOpen("task-modal-overlay", "task-modal");
}
function openTaskEdit(id, goToAssessment = false) {
  const t = TASKS.find((x) => x.id === id);
  if (!t) return;
  taskEditId = id;
  const _tName = t.applicant_name || t.name;
  document.getElementById("task-modal-heading").textContent = _tName;
  _setModalAvatar(_tName, t.status);
  document.getElementById("f-name").value = _tName;
  document.getElementById("f-status").value = t.status;
  document.getElementById("f-priority").value = t.priority;
  _setField("f-position", t.position);
  _rebuildAssigneeOptions();
  _setAssignees(t.assignees || (t.assignee ? [t.assignee] : ["Assistant"]));
  document.getElementById("f-start").value = t.start || t.application_date || "";
  document.getElementById("f-due").value = t.due || "";
  document.getElementById("f-notes").value = t.notes || "";
  _notesPreviewUpdate(t.notes || "");
  document.getElementById("f-folder").value = t.candidateFolder || "";
  // Applicant profile fields
  _setField("f-email", t.applicant_email || "");
  _setField("f-phone", t.applicant_phone || "");
  _setField("f-address", t.address || "");
  _setField("f-employment-type", t.employment_type || "");
  _setField("f-work-setup", t.work_setup || "");
  _setField("f-work-schedule", t.work_schedule || "");
  _setField("f-education-level", t.education_level || "");
  _setField("f-school", t.school || "");
  _setField("f-course", t.course || "");
  _setField("f-skills", t.skills || "");
  _setField("f-tools", t.tools || "");
  _setField("f-interview-slots", t.interview_slots || "");
  _setField("f-referral-source", t.referral_source || "");
  _setField("f-resume", t.resume_link || "");
  _setField("f-portfolio", t.portfolio_link || "");
  _setField("f-video-intro", t.video_intro_link || "");
  _setField("f-other-docs", t.other_docs_link || "");
  _setField("f-drive-folder", t.drive_folder_link || "");
  _updateLinkCard("f-resume", "lc-resume");
  _updateLinkCard("f-portfolio", "lc-portfolio");
  _updateLinkCard("f-video-intro", "lc-video-intro");
  _updateLinkCard("f-other-docs", "lc-other-docs");
  _updateLinkCard("f-drive-folder", "lc-drive-folder");
  _setField("f-app-date", t.application_date || t.start || "");
  _setField("f-followup-date", t.followup_date || "");
  // Reset assessment tabs to first tab (Typing)
  _resetAssessTabs();
  // Assessment fields — Typing Test
  _setField("f-typing-score",    t.typing_score     || "");
  _setField("f-word-typing",     t.word_typing      || "");
  _setField("f-knowledge-score", t.knowledge_score  || "");
  // Assessment fields — Verbal Test
  _setField("f-verbal-link",     t.verbal_link      || "");
  _setField("f-conflict-score",  t.conflict_score   || "");
  _setField("f-grammar-score",   t.grammar_score    || "");
  // Assessment fields — Excel Test
  _setField("f-data-entry-score",  t.data_entry_score  || "");
  _setField("f-formatting-score",  t.formatting_score  || "");
  _setField("f-sorting-score",     t.sorting_score     || "");
  _setField("f-interview-notes", t.interview_notes  || "");
  // Stage progress bar
  document.getElementById("task-stage-progress").innerHTML = buildStageProgress(
    t.status,
  );
  // Assessment panel visibility based on position
  _updateAssessmentPanel(t.position);
  // Refresh assessment invite card status
  _refreshAssessInviteUI(t);
  _updateReviewTab(t.status);
  if (t.status === "Endorsed" || t.status === "Review") _populateReviewTab(t);
  _updateInterviewScheduleTab(t.status);
  if (t.status === "In Progress" || t.status === "Interview") _populateInterviewScheduleTab(t);
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
  // Rejection reason banner
  const rrDisplay = document.getElementById("rejection-reason-display");
  const rrText = document.getElementById("rejection-reason-text");
  if (rrDisplay && rrText) {
    if (t.rejection_reason && t.status === "Rejected") {
      rrText.textContent = t.rejection_reason;
      rrDisplay.style.display = "block";
    } else {
      rrDisplay.style.display = "none";
    }
  }
  // Switch tab — go to Assessment tab if requested (e.g. "View Scores" action)
  _switchModalTab(goToAssessment ? "assessment" : "profile");
  _gsapModalOpen("task-modal-overlay", "task-modal");
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

/** Show Review tab only when stage is Endorsed (or legacy Review) */
function _updateReviewTab(status) {
  const btn = document.getElementById("tab-btn-review");
  if (!btn) return;
  const isReview = status === "Endorsed" || status === "Review";
  btn.style.display = isReview ? "" : "none";
  if (!isReview && btn.classList.contains("active")) {
    _switchModalTab("profile");
  }
}

/* ══════════════════════════════════════════════
   [SECTION: INTERVIEW] — Interview Schedule Tab
══════════════════════════════════════════════ */

/** Show the Interview tab only when stage is In Progress (or legacy Interview) */
function _updateInterviewScheduleTab(status) {
  const btn = document.getElementById("tab-btn-interview-schedule");
  if (!btn) return;
  const isInterview = status === "In Progress" || status === "Interview";
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

  // Auto-fill interviewer from task assignee, falling back to saved profile name
  const interviewerEl = document.getElementById("iv-interviewer");
  if (interviewerEl && !interviewerEl.value) {
    const _ivProfile = JSON.parse(
      localStorage.getItem("upstaff_profile") || "{}",
    );
    const _ivHrName = _ivProfile.firstName
      ? (_ivProfile.firstName + " " + (_ivProfile.lastName || "")).trim()
      : "Assistant";
    interviewerEl.value = task.assignee || _ivHrName;
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
    el.innerHTML = `<div class="u-no-data-pad">No interviews scheduled yet. Use the form above to add one.</div>`;
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
      <div class="u-surface-card">
        <div class="u-flex-between" style="margin-bottom:6px;">
          <div class="u-text-md u-font-700">
            ${e.round || e.interview_type || "Interview"}
          </div>
          <div class="u-flex-center u-gap-8">
            <span style="font-size:11px;font-weight:700;color:${sc};background:${sc}18;padding:2px 10px;border-radius:20px;">
              ${e.status || "Scheduled"}
            </span>
            <button
              onclick="deleteIvScheduleEvent(${e.id})"
              style="background:none;border:none;cursor:pointer;color:var(--light);font-size:13px;padding:0;line-height:1;"
              title="Remove">✕</button>
          </div>
        </div>
        <div class="u-text-base u-text-muted u-flex-wrap u-gap-10">
          <span>📅 ${e.date || "—"}${startFmt ? " @ " + startFmt : ""}${endFmt}</span>
          ${e.interviewer ? `<span>👤 ${sanitize(e.interviewer)}</span>` : ""}
          ${ml ? `<a href="${ml}" target="_blank" style="color:var(--cyan);font-weight:700;">🔗 Join</a>` : ""}
        </div>
        ${e.notes ? `<div style="font-size:11px;color:var(--light);margin-top:6px;padding-top:6px;border-top:1px solid var(--border);">${sanitize(e.notes)}</div>` : ""}
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
    showToast("Zoom integration is not available. Paste a link manually.");
    return;
  } else if (_ivPlatform === "meet") {
    if (gcalSignedIn) {
      // Real Meet room will be auto-created when the event is saved to GCal
      showToast(
        "💡 A real Google Meet room will be created automatically when you save.",
      );
      return;
    }
    // Can't generate a real Meet link without GCal OAuth — open meet.google.com/new
    // so the user can create a real room and paste the link
    window.open("https://meet.google.com/new", "_blank", "noopener");
    showToast("📋 Copy the link from Google Meet and paste it below.");
    return;
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
  window.open("https://meet.google.com/new", "_blank", "noopener");
}

/** Save a new interview from the Interview tab form into calEvents */
function saveInterviewSchedule() {
  const taskId = taskEditId || window._editingTaskId;
  const task = TASKS.find((x) => x.id === taskId);
  if (!task) {
    showToast(
      "⚠️ Could not find applicant. Save the form first, then add the interview.",
    );
    return;
  }

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
  if (meetingLink) {
    const urlCheck = validateField(meetingLink, "url");
    if (!urlCheck.ok) {
      showToast("⚠️ Meeting link must be a valid URL (include https://).");
      document.getElementById("iv-meeting-link")?.focus();
      return;
    }
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

  // Push interview event to Google Calendar if signed in
  if (typeof gcalSignedIn !== "undefined" && gcalSignedIn &&
      typeof gcalCreateEvent === "function") {
    gcalCreateEvent(ev).then((googleEventId) => {
      if (googleEventId) {
        ev.google_event_id = googleEventId;
        persistSave();
      }
    }).catch((e) => console.warn("[GCal] Interview event create failed:", e.message));
  }

  // Reset link + notes but keep date/type/interviewer for consecutive scheduling
  document.getElementById("iv-meeting-link").value = "";
  document.getElementById("iv-notes").value = "";
  document.getElementById("iv-status").value = "Scheduled";
  const ivPreview = document.getElementById("iv-link-preview");
  if (ivPreview) ivPreview.style.display = "none";

  _renderIvSavedList(task);
  showToast("✅ Interview scheduled!");

  // Update task.interview_slots field with the new slot and sync to sheet
  const _slotStr = `${ev.date} ${ev.start_time}–${ev.end_time} (${ev.round})`;
  task.interview_slots = task.interview_slots
    ? task.interview_slots + "\n" + _slotStr
    : _slotStr;
  persistSave();
  if ((task._source === "api" || task.supabase_id) && window.UpstaffAPI) {
    UpstaffAPI.updateApplicant({
      supabase_id: task.supabase_id,
      email: task.applicant_email,
      interview_slots: task.interview_slots,
    }).catch((e) =>
      console.warn("[API] Interview slot sync failed:", e.message),
    );
  }
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
    el.innerHTML = `<div class="u-no-data-center">No interviews scheduled yet. Use the Calendar to add one.</div>`;
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
    ${notes ? `<div class="rv-assess-row rv-assess-row-full"><span class="rv-assess-label">💬 Interview Notes</span><span class="rv-assess-val" style="font-weight:400;color:var(--muted);">${sanitize(notes)}</span></div>` : ""}
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
    <div class="rv-summary-row"><span class="rv-summary-label">Position</span><span class="rv-summary-val">${sanitize(task.position) || "—"}</span></div>
    <div class="rv-summary-row"><span class="rv-summary-label">Stage</span><span class="rv-summary-val">${sanitize(task.status) || "—"}</span></div>
    <div class="rv-summary-row"><span class="rv-summary-label">Priority</span><span class="rv-summary-val" style="color:${priorityColor};font-weight:700;">${sanitize(task.priority) || "—"}</span></div>
    <div class="rv-summary-row"><span class="rv-summary-label">Assignee</span><span class="rv-summary-val">${sanitize(task.assignee) || "—"}</span></div>
    <div class="rv-summary-row"><span class="rv-summary-label">Applied Date</span><span class="rv-summary-val">${sanitize(task.application_date || task.start) || "—"}</span></div>
    ${task.work_schedule ? `<div class="rv-summary-row"><span class="rv-summary-label">Work Schedule</span><span class="rv-summary-val">${sanitize(task.work_schedule)}</span></div>` : ""}
    ${task.interview_slots ? `<div class="rv-summary-row"><span class="rv-summary-label">Interview Slots</span><span class="rv-summary-val" style="white-space:pre-line;">${sanitize(task.interview_slots)}</span></div>` : ""}
    <div class="rv-summary-row"><span class="rv-summary-label">Folder</span><span class="rv-summary-val">${sanitize(task.candidateFolder) || "—"}</span></div>
    <div class="rv-summary-row"><span class="rv-summary-label">Email</span><span class="rv-summary-val">${sanitize(task.applicant_email) || "—"}</span></div>
    <div class="rv-summary-row"><span class="rv-summary-label">Phone</span><span class="rv-summary-val">${sanitize(task.applicant_phone) || "—"}</span></div>
    ${resume ? `<div class="rv-summary-row"><span class="rv-summary-label">Resume</span><a href="${resume}" target="_blank" style="color:var(--cyan);font-size:12px;font-weight:700;">View Resume</a></div>` : ""}
    ${portfolio ? `<div class="rv-summary-row"><span class="rv-summary-label">Portfolio</span><a href="${portfolio}" target="_blank" style="color:var(--cyan);font-size:12px;font-weight:700;">View Portfolio</a></div>` : ""}
  `;
}

function closeTaskModal() {
  _gsapModalClose("task-modal-overlay", "task-modal", () => {
    taskEditId = null;
    window._editingTaskId = null;
  });
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
  ?.addEventListener("click", () => openTaskNew());

// Live-update stage progress bar when user changes the status dropdown
document.getElementById("f-status")?.addEventListener("change", function () {
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

document
  .getElementById("btn-task-save")
  ?.addEventListener("click", async () => {
    const name = document.getElementById("f-name").value.trim();
    if (!name) {
      await uiAlert("Please enter the applicant's name.", {
        icon: "⚠️",
        title: "Name Required",
      });
      return;
    }
    // Validate optional fields format
    const formOk = validateForm([
      { id: "f-email", type: "email", label: "Email" },
      { id: "f-phone", type: "phone", label: "Phone" },
      { id: "f-resume", type: "url", label: "Resume Link" },
      { id: "f-portfolio", type: "url", label: "Portfolio Link" },
      { id: "f-video-intro", type: "url", label: "Video Intro Link" },
      { id: "f-other-docs", type: "url", label: "Other Docs Link" },
      { id: "f-drive-folder", type: "url", label: "Drive Folder Link" },
    ]);
    if (!formOk) {
      showToast("⚠️ Please fix the highlighted fields.");
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
      assignees: _getAssignees().length ? _getAssignees() : ["Assistant"],
      assignee: _getAssignees()[0] || existing?.assignee || "Assistant",
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
      address:
        document.getElementById("f-address")?.value?.trim() ||
        existing?.address ||
        "",
      employment_type:
        document.getElementById("f-employment-type")?.value ||
        existing?.employment_type ||
        "",
      work_setup:
        document.getElementById("f-work-setup")?.value ||
        existing?.work_setup ||
        "",
      work_schedule:
        document.getElementById("f-work-schedule")?.value ||
        existing?.work_schedule ||
        "",
      education_level:
        document.getElementById("f-education-level")?.value ||
        existing?.education_level ||
        "",
      school:
        document.getElementById("f-school")?.value?.trim() ||
        existing?.school ||
        "",
      course:
        document.getElementById("f-course")?.value?.trim() ||
        existing?.course ||
        "",
      skills:
        document.getElementById("f-skills")?.value?.trim() ||
        existing?.skills ||
        "",
      tools:
        document.getElementById("f-tools")?.value?.trim() ||
        existing?.tools ||
        "",
      interview_slots:
        document.getElementById("f-interview-slots")?.value?.trim() ||
        existing?.interview_slots ||
        "",
      referral_source:
        document.getElementById("f-referral-source")?.value ||
        existing?.referral_source ||
        "",
      resume_link:
        document.getElementById("f-resume")?.value?.trim() ||
        existing?.resume_link ||
        "",
      portfolio_link:
        document.getElementById("f-portfolio")?.value?.trim() ||
        existing?.portfolio_link ||
        "",
      video_intro_link:
        document.getElementById("f-video-intro")?.value?.trim() ||
        existing?.video_intro_link ||
        "",
      other_docs_link:
        document.getElementById("f-other-docs")?.value?.trim() ||
        existing?.other_docs_link ||
        "",
      drive_folder_link:
        document.getElementById("f-drive-folder")?.value?.trim() ||
        existing?.drive_folder_link ||
        "",
      application_date:
        document.getElementById("f-app-date")?.value ||
        existing?.application_date ||
        "",
      followup_date:
        document.getElementById("f-followup-date")?.value || "",
      followup_notified: existing?.followup_notified || "",
      // Assessment scores — Typing Test
      typing_score:     document.getElementById("f-typing-score")?.value     || existing?.typing_score     || "",
      word_typing:      document.getElementById("f-word-typing")?.value      || existing?.word_typing      || "",
      knowledge_score:  document.getElementById("f-knowledge-score")?.value  || existing?.knowledge_score  || "",
      // Assessment scores — Verbal Test
      verbal_link:      document.getElementById("f-verbal-link")?.value?.trim() || existing?.verbal_link  || "",
      conflict_score:   document.getElementById("f-conflict-score")?.value   || existing?.conflict_score   || "",
      grammar_score:    document.getElementById("f-grammar-score")?.value    || existing?.grammar_score    || "",
      // Assessment scores — Excel Test
      data_entry_score: document.getElementById("f-data-entry-score")?.value || existing?.data_entry_score || "",
      formatting_score: document.getElementById("f-formatting-score")?.value || existing?.formatting_score || "",
      sorting_score:    document.getElementById("f-sorting-score")?.value    || existing?.sorting_score    || "",
      interview_notes:  document.getElementById("f-interview-notes")?.value  || existing?.interview_notes  || "",
      // Preserve pipeline timestamps
      hired_at:
        existing?.hired_at ||
        (newStatus === "Hired" ? new Date().toISOString() : ""),
      rejected_at:
        existing?.rejected_at ||
        (newStatus === "Rejected" ? new Date().toISOString() : ""),
      archived:
        existing?.archived || ["Closed", "Rejected", "Cancelled"].includes(newStatus),
      stage_changed_at:
        newStatus !== existing?.status
          ? new Date().toISOString()
          : existing?.stage_changed_at,
      // Preserve activity, comments, attachments, and new fields
      comments: existing?.comments || [],
      activity: existing?.activity || [],
      attachments: existing?.attachments || [],
      stage_history: existing?.stage_history || [],
      rejection_reason: existing?.rejection_reason || "",
    };
    // Log activity for status change
    if (taskEditId && existing && newStatus !== existing.status) {
      const _histByFn = () => {
        try {
          const p = JSON.parse(localStorage.getItem("upstaff_profile") || "{}");
          return p.firstName
            ? (p.firstName + " " + (p.lastName || "")).trim()
            : "HR Admin";
        } catch (_) {
          return "HR Admin";
        }
      };
      t.activity.push({
        id: Date.now(),
        action: "stage_change",
        by: _histByFn(),
        at: new Date().toISOString(),
        detail: `${existing.status} → ${newStatus}`,
      });
      t.stage_history.push({
        from: existing.status,
        to: newStatus,
        at: new Date().toISOString(),
        by: _histByFn(),
      });
      pushNotif(
        "stage",
        `${t.applicant_name || t.name} moved to ${newStatus}`,
        t.id,
      );
    }

    if (taskEditId) {
      const i = TASKS.findIndex((x) => x.id === taskEditId);
      if (i > -1) TASKS[i] = t;
      showToast("✅ Task updated!");
      // Sync status change to partner API when edited via the save form
      if (
        existing &&
        newStatus !== existing.status &&
        window.UpstaffAPI &&
        (t._source === "api" || t.supabase_id)
      ) {
        UpstaffAPI.syncStatusToApi(t, newStatus)
          .then((resolvedPartnerStatus) => {
            if (resolvedPartnerStatus) {
              t.partner_status = resolvedPartnerStatus;
              persistSave();
            }
          })
          .catch((e) => {
            console.warn("[API] Status sync failed on save:", e.message);
          });
      }
      // Full field sync — push all edited fields to the sheet regardless of status change
      if ((t._source === "api" || t.supabase_id) && window.UpstaffAPI) {
        UpstaffAPI.updateApplicant({
          supabase_id: t.supabase_id,
          email: t.applicant_email,
          full_name: t.applicant_name || t.name,
          status: t.partner_status || t.status,
          phone: t.applicant_phone,
          address: t.address,
          positions: t.position,
          employment_type: t.employment_type,
          work_setup: t.work_setup,
          work_schedule: t.work_schedule,
          education_level: t.education_level,
          school: t.school,
          course: t.course,
          skills: t.skills,
          tools: t.tools,
          interview_slots: t.interview_slots,
          referral_source: t.referral_source,
          resume_link: t.resume_link,
          portfolio_link: t.portfolio_link,
          video_intro_link: t.video_intro_link,
          other_docs_link: t.other_docs_link,
          notes: t.notes,
          drive_folder_link: t.drive_folder_link,
          // Assessment scores — Excel Test
          data_entry_score: t.data_entry_score || "",
          formatting_score: t.formatting_score || "",
          sorting_score:    t.sorting_score    || "",
        }).catch((e) =>
          console.warn("[API] Full field sync failed:", e.message),
        );
      }
    } else {
      TASKS.push(t);
      showToast("✅ Task added!");
      // Sync new applicant to Google Sheet if API is configured
      if (window.UpstaffAPI && UpstaffAPI.isConfigured()) {
        try {
          const _addRes = await UpstaffAPI.addApplicant({
            status: t.partner_status || "For Interview",
            full_name: t.name || t.applicant_name || "",
            email: t.applicant_email || "",
            phone: t.applicant_phone || "",
            address: t.address || "",
            positions: t.position || "",
            employment_type: t.employment_type || "",
            work_setup: t.work_setup || "",
            work_schedule: t.work_schedule || "",
            education_level: t.education_level || "",
            school: t.school || "",
            course: t.course || "",
            skills: t.skills || "",
            tools: t.tools || "",
            interview_slots: t.interview_slots || "",
            referral_source: t.referral_source || "",
            resume_link: t.resume_link || "",
            portfolio_link: t.portfolio_link || "",
            video_intro_link: t.video_intro_link || "",
            other_docs_link: t.other_docs_link || "",
            notes: t.notes || "",
            drive_folder_link: t.drive_folder_link || "",
          });
          // Mark as API-sourced so it won't duplicate on next sync
          t._source = "api";
          if (_addRes && _addRes.supabaseId) t.supabase_id = _addRes.supabaseId;
        } catch (e) {
          console.warn("Could not sync new applicant to sheet:", e.message);
          showToast("⚠️ Saved locally — sheet sync failed: " + e.message);
        }
      }
    }
    persistSave();

    // ── Auto-update GCal if this task already has a linked event (no checkbox needed) ──
    if (taskEditId && t.gcalEventId && !sync &&
        typeof gcalSignedIn !== "undefined" && gcalSignedIn &&
        typeof _taskSyncToGcal === "function") {
      _taskSyncToGcal(t).catch((e) =>
        console.warn("[GCal] Auto-update on edit failed:", e.message)
      );
    }

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
          resource: {
            status: "cancelled",
            summary: `❌ [Cancelled] ${t.name}`,
          },
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
    // Delegate to listDeleteApplicant which handles GCal removal + API delete + local removal
    await listDeleteApplicant(taskEditId);
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
    New: "📋",
    "In Progress": "🔄",
    Endorsed: "📤",
    Hired: "✅",
    Closed: "🚫",
    Rejected: "❌",
    Cancelled: "🚫",
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
        : t.status === "Closed" || t.status === "Rejected" || t.status === "Cancelled"
          ? "8"
          : t.status === "Endorsed" || t.status === "In Progress"
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
  { name: "Upstaff Resume", icon: "📝", color: "#ff6584" },
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

function docToFilename(name) {
  return name
    .replace(/\s*\/\s*/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "");
}

function saveDriveLink(empId, link) {
  const e = EMPLOYEES.find((x) => x.id === empId);
  if (!e) return;
  e.driveLink = link.trim();
  empPersistSave();
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
  grid.innerHTML =
    '<div class="skeleton-list-wrap">' +
    Array(4).fill('<div class="skeleton skeleton-card"></div>').join("") +
    "</div>";
  requestAnimationFrame(() => {
    grid.innerHTML = emps.map((e) => buildEmployeeCard(e)).join("");
  });
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
      <div class="u-flex-1">
        <div class="employee-name">${sanitize(e.fname)} ${sanitize(e.lname)}</div>
        <div class="employee-position">${sanitize(e.position)}</div>
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

function filterOnboarding() {
  // Filter button on onboarding view — no-op (filtering handled by #onboarding-filter-status dropdown)
}

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
  _gsapModalOpen("hire-modal-overlay", "hire-modal");
}
function closeHireModal() {
  _gsapModalClose("hire-modal-overlay", "hire-modal");
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
      const editOk = validateForm([
        { id: "hf-email", type: "email", label: "Email" },
        { id: "hf-phone", type: "phone", label: "Phone" },
      ]);
      if (!editOk) {
        showToast("⚠️ Please fix the highlighted fields.");
        return;
      }
      e.fname = fname;
      e.lname = lname;
      e.email = document.getElementById("hf-email")?.value || "";
      e.phone = document.getElementById("hf-phone")?.value || "";
      e.address = document.getElementById("hf-address")?.value || "";
      e.position =
        document.getElementById("hf-position")?.value || JOB_POSITIONS[0];
      e.emptype =
        document.getElementById("hf-emptype")?.value || "Probationary";
      e.start = document.getElementById("hf-start")?.value || "";
      e.manager = document.getElementById("hf-manager")?.value || "Assistant";
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
  const hireOk = validateForm([
    { id: "hf-email", type: "email", label: "Email" },
    { id: "hf-phone", type: "phone", label: "Phone" },
  ]);
  if (!hireOk) {
    showToast("⚠️ Please fix the highlighted fields.");
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
    emptype: document.getElementById("hf-emptype")?.value || "Probationary",
    start:
      document.getElementById("hf-start")?.value ||
      new Date().toISOString().slice(0, 10),
    manager: document.getElementById("hf-manager")?.value || "Assistant",
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
      <div class="u-flex-1">
        <div style="font-size:16px;font-weight:800;font-family:'Syne',sans-serif;color:var(--text);">${sanitize(e.fname)} ${sanitize(e.lname)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px;">${sanitize(e.position)}</div>
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
      </div>
      ${e.notes ? `<div class="u-surface-note">"${sanitize(e.notes)}"</div>` : ""}
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
            <span class="checklist-item-text">${sanitize(c.item)}</span>
          </div>`,
          )
          .join("")}
      </div>
    </div>



    <div class="emp-detail-section">
      <div class="emp-detail-section-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>Documents</span>
        <span style="font-size:10px;font-weight:600;color:var(--muted);">${docs.filter((d) => d.uploaded).length}/${docs.length} received</span>
      </div>

      <!-- Naming Convention Guide -->
      <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Naming Convention Guide</div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:14px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:4px 6px;color:var(--muted);font-weight:600;border-bottom:1px solid var(--border);">Document</th>
            <th style="text-align:left;padding:4px 6px;color:var(--muted);font-weight:600;border-bottom:1px solid var(--border);">File Should Be Named</th>
          </tr>
        </thead>
        <tbody>
          ${DOC_TYPES.map(
            (dt) => `<tr>
            <td style="padding:3px 6px;color:var(--text);border-bottom:1px solid var(--border);">${sanitize(dt.name)}</td>
            <td style="padding:3px 6px;font-family:monospace;color:var(--cyan);border-bottom:1px solid var(--border);">${docToFilename(dt.name)}</td>
          </tr>`,
          ).join("")}
        </tbody>
      </table>

      <!-- Drive Folder Link -->
      <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Applicant's Drive Folder</div>
      <div class="link-card" id="lc-emp-drive-${e.id}" style="margin-bottom:14px;">
        <div class="link-card-input-row">
          <input type="url" class="form-input link-card-input" id="drive-link-${e.id}"
            placeholder="Paste applicant's Drive folder link…"
            value="${sanitize(e.driveLink || "")}"
            onchange="saveDriveLink(${e.id},this.value)"
            onblur="saveDriveLink(${e.id},this.value)"/>
          <button type="button" class="link-card-btn" id="lc-emp-drive-${e.id}-copy" style="display:none" title="Copy link">📋</button>
          <button type="button" class="link-card-btn" id="lc-emp-drive-${e.id}-open" style="display:none" title="Open folder">↗</button>
        </div>
        <div class="link-card-badge" id="lc-emp-drive-${e.id}-badge" style="display:none"></div>
      </div>

      <!-- Received Checkboxes -->
      <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Received Confirmation</div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        ${docs
          .map(
            (d, i) => `
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:5px 6px;border-radius:7px;background:${d.uploaded ? "rgba(67,233,123,.06)" : "transparent"};">
            <input type="checkbox" ${d.uploaded ? "checked" : ""} onchange="toggleDocUploaded(${e.id},${i})"
              style="accent-color:#43e97b;width:14px;height:14px;cursor:pointer;flex-shrink:0;"/>
            <span style="font-size:11px;color:${d.uploaded ? "#43e97b" : "var(--text)"};">${sanitize(d.name)} received</span>
          </label>`,
          )
          .join("")}
      </div>
    </div>
  `;

  _gsapModalOpen("emp-detail-overlay", "emp-detail-panel");

  // Wire up smart link card for the drive folder input
  const _empDriveInput = document.getElementById(`drive-link-${e.id}`);
  const _empCardId = `lc-emp-drive-${e.id}`;
  _updateLinkCard(`drive-link-${e.id}`, _empCardId);
  if (_empDriveInput) {
    _empDriveInput.addEventListener("input", () => {
      saveDriveLink(e.id, _empDriveInput.value);
      _updateLinkCard(`drive-link-${e.id}`, _empCardId);
    });
  }
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
  _gsapModalClose("emp-detail-overlay", "emp-detail-panel", () => {
    _empDetailId = null;
    if (document.getElementById("view-onboarding").style.display !== "none")
      renderOnboarding();
  });
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
      <tbody><tr><td colspan="11" class="u-text-center" style="padding:48px 24px;">
        <div class="u-text-md u-text-muted u-flex-col u-gap-8" style="align-items:center;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span class="u-font-600">No applicants found</span>
          <span class="u-text-sm" style="opacity:0.6;">Try a different search or add an applicant</span>
        </div>
      </td></tr></tbody>`;
    return;
  }
  const tbody = `<tbody>${data
    .map((t) => {
      const sm = STATUS_META[t.status] || { color: "#9ca3af", bg: "#f3f4f6" };
      const pc = PRIORITY_COLORS[t.priority] || "#ccc";
      const _tblAssignees = t.assignees || (t.assignee ? [t.assignee] : ["HR"]);
      const ac = avatarColor(_tblAssignees[0] || "HR");
      const dc = dueCls(t.due);
      const typScore = t.typing_score
        ? `<span style="font-weight:600;color:#44d7e9;">${t.typing_score}</span>`
        : `<span class="u-text-sm u-text-muted">—</span>`;
      const knwScore = t.knowledge_score
        ? (() => {
            const s = parseInt(t.knowledge_score);
            const c = s >= 75 ? "#43e97b" : "#fa4d56";
            return `<span style="font-weight:600;color:${c};">${s}%</span>`;
          })()
        : `<span class="u-text-sm u-text-muted">—</span>`;
      return `<tr onclick="openTaskEdit(${t.id})">
      <td style="font-weight:500;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sanitize(t.name)}</td>
      <td style="font-size:12px;color:var(--muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sanitize(t.applicant_email || "—")}</td>
      <td style="font-size:12px;color:var(--muted);white-space:nowrap;">${sanitize(t.applicant_phone || "—")}</td>
      <td><span class="${statusPillClass(t.status)}">${t.status}</span></td>
      <td><span class="priority-pill" style="background:${pc}22;color:${pc};">${t.priority}</span></td>
      <td>${sanitize(t.position)}</td>
      <td><div class="assignee-chip">${_tblAssignees
        .slice(0, 2)
        .map(
          (a, i) =>
            `<div class="assignee-avatar" style="background:${avatarColor(a)};margin-left:${i > 0 ? "-5px" : "0"};" title="${sanitize(a)}">${initials(a)}</div>`,
        )
        .join(
          "",
        )}<span style="font-size:11px;margin-left:4px;">${sanitize(_tblAssignees[0])}</span>${_tblAssignees.length > 1 ? `<span style="font-size:10px;color:var(--muted);">+${_tblAssignees.length - 1}</span>` : ""}</div></td>
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

document.getElementById("export-csv-btn")?.addEventListener("click", () => {
  const headers = [
    "ID", "Applicant Name", "Email", "Phone",
    "Stage", "Priority", "Position", "Assigned To",
    "Application Date", "Start Date", "Due Date",
    // Typing Test
    "Typing Assessment (WPM)", "Word Typing (WPM)", "Knowledge Test (/100)",
    // Verbal Test
    "Verbal Comm Link", "Conflict Reso (/20)", "Grammar Test (/20)",
    // Excel Test
    "Data Entry", "Formatting", "Sorting",
    // Overall
    "Assessment Result",
    // Links & Notes
    "Resume Link", "Portfolio Link", "Interview Notes", "General Notes", "Candidate Folder",
  ];
  const rows = [headers];
  TASKS.forEach((t) => {
    const ks = t.knowledge_score ? parseInt(t.knowledge_score) : null;
    const assessResult = ks !== null ? (ks >= 75 ? "PASSED" : "FAILED") : "";
    rows.push([
      t.id,
      t.applicant_name || t.name || "",
      t.applicant_email || "",
      t.applicant_phone || "",
      t.status || "",
      t.priority || "",
      t.position || "",
      t.assignee || "",
      t.application_date || t.start || "",
      t.start || "",
      t.due || "",
      // Typing Test
      t.typing_score || "",
      t.word_typing || "",
      t.knowledge_score || "",
      // Verbal Test
      t.verbal_link || "",
      t.conflict_score || "",
      t.grammar_score || "",
      // Excel Test
      t.data_entry_score || "",
      t.formatting_score || "",
      t.sorting_score || "",
      // Overall
      assessResult,
      // Links & Notes
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
   [SECTION: CALENDAR] — Calendar Views (Month/Week/Day/Agenda)
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
    // Group by time slot
    const timeGroups = {};
    dayEvts.forEach((e) => {
      const key = e.time || e.start_time || "";
      if (!timeGroups[key]) timeGroups[key] = [];
      timeGroups[key].push(e);
    });
    const sortedKeys = Object.keys(timeGroups).sort();
    let evHtml = sortedKeys
      .slice(0, 3)
      .map((time) => {
        const grp = timeGroups[time];
        const bg = getEventColor(grp[0]);
        const ml = grp.some((e) => e.meeting_link || e.meetingLink);
        if (grp.length === 1) {
          const e = grp[0];
          return `<div class="cal-event" style="background:${bg} !important;color:#0f172a !important;border:2px solid ${bg} !important;" onclick="event.stopPropagation();openEdit(${e.id})">
                  <div class="cal-event-dot" style="background:rgba(0,0,0,0.3);flex-shrink:0;"></div>
          ${sanitize((e.name || "").split(" ")[0])} ${fmtTime(time)}
          ${ml ? `<span style="margin-left:3px;opacity:.7;" title="Has meeting link">📹</span>` : ""}
        </div>`;
        } else {
          return `<div class="cal-event cal-event-grouped" style="background:${bg} !important;color:#0f172a !important;border:2px solid ${bg} !important;" onclick="event.stopPropagation();openGroupSlot('${ds}','${time}')">
                  <div class="cal-event-dot" style="background:rgba(0,0,0,0.3);flex-shrink:0;"></div>
          ${(() => {
            const _ap = grp.filter((e) => !e.isGoogleEvent).length;
            const _gc = grp.length - _ap;
            if (_ap > 0 && _gc === 0)
              return `<strong>${_ap}</strong>&nbsp;Applicant${_ap > 1 ? "s" : ""}`;
            if (_ap === 0)
              return `<strong>${_gc}</strong>&nbsp;Event${_gc > 1 ? "s" : ""}`;
            return `<strong>${grp.length}</strong>&nbsp;Events`;
          })()} · ${fmtTime(time)}
          ${ml ? `<span style="margin-left:3px;opacity:.7;" title="Has meeting link">📹</span>` : ""}
        </div>`;
        }
      })
      .join("");
    if (sortedKeys.length > 3)
      evHtml += `<div class="cal-more">+${sortedKeys.length - 3} more</div>`;
    html += `<div class="cal-cell${isT ? " today" : ""}" onclick="calCellClick('${ds}')"><div class="cal-cell-num">${d}</div>${evHtml}</div>`;
  }
  const total = startDow + daysInMo,
    rem = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= rem; d++) {
    html += `<div class="cal-cell other-month" onclick="calCellClick('${fmtDate(new Date(y, mo + 1, d))}')"><div class="cal-cell-num">${d}</div></div>`;
  }
  html += `</div></div>`;
  // Show empty-state hint if no events at all
  if (calEvents.filter((e) => !e.isGoogleEvent).length === 0) {
    html += `<div class="empty-state">
      <div class="empty-state-icon">📅</div>
      <div class="empty-state-title">No interviews scheduled yet</div>
      <div class="empty-state-subtitle">Click <strong>Schedule Interview</strong> to add one, or sync from Google Calendar.</div>
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
      // Group by time slot
      const wkGroups = {};
      events
        .filter((e) => e.date === ds)
        .forEach((e) => {
          const key = e.time || e.start_time || "";
          if (!wkGroups[key]) wkGroups[key] = [];
          wkGroups[key].push(e);
        });
      const isDarkW =
        document.documentElement.getAttribute("data-theme") === "dark";
      const evColorW = isDarkW ? "#ffffff" : "#0f172a";
      const evts = Object.entries(wkGroups)
        .map(([time, grp]) => {
          const [eh, em] = (time || "09:00").split(":").map(Number);
          const top = (eh - 7 + em / 60) * HH;
          const bg = getEventColor(grp[0]);
          if (grp.length === 1) {
            const e = grp[0];
            return `<div class="cal-week-event" style="top:${top}px;height:${HH}px;background:${bg};color:${evColorW};border:1px solid ${bg};" onclick="event.stopPropagation();openEdit(${e.id})">${fmtTime(time)} ${sanitize((e.name || "").split(" ")[0])}</div>`;
          } else {
            return `<div class="cal-week-event cal-event-grouped" style="top:${top}px;height:${HH}px;background:${bg};color:${evColorW};border:1px solid ${bg};" onclick="event.stopPropagation();openGroupSlot('${ds}','${time}')">${fmtTime(time)} · <strong>${grp.length}</strong> ${grp.every((e) => !e.isGoogleEvent) ? `Applicant${grp.length > 1 ? "s" : ""}` : "Events"}</div>`;
          }
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
    .sort((a, b) =>
      (a.time || a.start_time || "").localeCompare(
        b.time || b.start_time || "",
      ),
    );
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
  // Group by time slot
  const dayGroups = {};
  dayEvts.forEach((e) => {
    const key = e.time || e.start_time || "";
    if (!dayGroups[key]) dayGroups[key] = [];
    dayGroups[key].push(e);
  });
  const isDarkD =
    document.documentElement.getAttribute("data-theme") === "dark";
  const evColorD = isDarkD ? "#ffffff" : "#0f172a";
  const evts = Object.entries(dayGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, grp]) => {
      const [eh, em] = (time || "09:00").split(":").map(Number);
      const top = (eh - 7 + em / 60) * HH;
      const bg = getEventColor(grp[0]);
      if (grp.length === 1) {
        const e = grp[0];
        return `<div class="cal-day-event" style="top:${top}px;height:${HH}px;background:${bg};color:${evColorD};border:1px solid ${bg};" onclick="event.stopPropagation();openEdit(${e.id})"><strong>${fmtTime(time)}</strong> — ${sanitize(e.name || "")} (${sanitize(e.position || "")})<br><span style="font-size:10px;opacity:.85;">${sanitize(e.round || "")} · ${sanitize(e.type || "")}</span></div>`;
      } else {
        const nameList = grp
          .map((e) => sanitize(e.name || "Unknown"))
          .join(", ");
        return `<div class="cal-day-event cal-event-grouped" style="top:${top}px;height:${HH}px;background:${bg};color:${evColorD};border:1px solid ${bg};" onclick="event.stopPropagation();openGroupSlot('${ds}','${time}')"><strong>${fmtTime(time)}</strong> — ${grp.length} ${grp.every((e) => !e.isGoogleEvent) ? `Applicant${grp.length > 1 ? "s" : ""}` : "Events"}<br><span style="font-size:10px;opacity:.85;">${nameList}</span></div>`;
      }
    })
    .join("");
  document.getElementById("cal-main-area").innerHTML =
    `<div class="cal-day-view"><div class="cal-day-view-header"><div></div><div class="cal-day-view-title">${calDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div></div><div class="cal-day-body"><div class="cal-time-col">${timeCol}</div><div style="position:relative;">${blocks}${evts}</div></div></div>`;
}

function renderAgenda() {
  const today = todayStr();
  const evts = getFiltered()
    .filter((e) => e.date === today)
    .sort((a, b) =>
      (a.time || a.start_time || "").localeCompare(
        b.time || b.start_time || "",
      ),
    );
  document.getElementById("cal-today-label").textContent =
    new Date().toLocaleDateString("en-PH", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  const el = document.getElementById("cal-today-agenda");
  if (!evts.length) {
    el.innerHTML = `<div class="u-no-data-md">No interviews today.</div>`;
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
    `<div class="u-no-data u-no-data-pad" style="line-height:1.8;">
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
   [SECTION: SETTINGS-UI] — Settings Calendar List
   Renders the full calendar list inside Settings → Calendars,
   with type badge, color swatch, event count, and a delete button.
────────────────────────────────────────────── */
function renderSettingsCalendarList() {
  const el = document.getElementById("settings-cal-list");
  if (!el) return;

  if (!UPSTAFF_CALENDARS.length) {
    el.innerHTML = `<div class="u-no-data-md">
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

  const primaryCal = UPSTAFF_CALENDARS.find(
    (c) => c.calendarType === "Primary",
  );
  const connectedHeader = primaryCal
    ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 12px;
           border-radius:8px;background:var(--surface-3);border:1px solid var(--border);">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" stroke-width="2.5" stroke-linecap="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
        <span style="font-size:11px;color:var(--muted);">Status:</span>
        <span style="font-size:11px;font-weight:700;color:var(--cyan);">Google Calendar Connected</span>
      </div>`
    : "";

  el.innerHTML =
    connectedHeader +
    UPSTAFF_CALENDARS.map((cal) => {
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
      <div class="u-flex-1">
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
    `<span class="u-text-sm u-font-700 u-text-muted u-font-mono">Calendars:</span>` +
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
  const _newApplicantName = t ? (t.applicant_name || t.name || "") : "";
  document.getElementById("cal-f-name").value = _newApplicantName;
  const _calSubheadNew = document.getElementById("cal-modal-subhead");
  if (_calSubheadNew) _calSubheadNew.textContent = _newApplicantName || "Fill in the interview details below";
  _setField("cal-f-position", t ? (t.position || "Intake Caller") : "Intake Caller");
  const _calProfile = JSON.parse(
    localStorage.getItem("upstaff_profile") || "{}",
  );
  const _calHrName = _calProfile.firstName
    ? (_calProfile.firstName + " " + (_calProfile.lastName || "")).trim()
    : "Assistant";
  document.getElementById("cal-f-interviewer").value = t
    ? t.assignee || _calHrName
    : _calHrName;

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
  _gsapModalOpen("cal-modal-overlay", "cal-modal");
}
function openGroupSlot(date, time) {
  const grp = getFiltered().filter(
    (e) => e.date === date && (e.time || e.start_time) === time,
  );
  if (!grp.length) return;

  const existing = document.getElementById("cal-group-popup");
  if (existing) existing.remove();

  const popup = document.createElement("div");
  popup.id = "cal-group-popup";
  popup.className = "cal-group-popup";

  const rows = grp
    .map(
      (
        e,
      ) => `<div class="cal-group-popup-row" onclick="document.getElementById('cal-group-popup').remove();openEdit(${e.id})">
      <div class="cal-group-popup-dot" style="background:${getEventColor(e)};"></div>
      <div class="cal-group-popup-info">
        <div class="cal-group-popup-name">${sanitize(e.name || "Unknown")}</div>
        <div class="cal-group-popup-meta">${sanitize(e.position || "")}${e.round ? " · " + sanitize(e.round) : ""}</div>
      </div>
    </div>`,
    )
    .join("");

  popup.innerHTML = `
    <div class="cal-group-popup-header">
      <span>${fmtTime(time)} &nbsp;·&nbsp; ${(() => {
        const _ap = grp.filter((e) => !e.isGoogleEvent).length;
        const _gc = grp.length - _ap;
        if (_ap > 0 && _gc === 0)
          return `${_ap} Applicant${_ap > 1 ? "s" : ""}`;
        if (_ap === 0) return `${_gc} Event${_gc > 1 ? "s" : ""}`;
        return `${grp.length} Events`;
      })()}</span>
      <button class="cal-group-popup-close" onclick="document.getElementById('cal-group-popup').remove()">×</button>
    </div>
    <div class="cal-group-popup-list">${rows}</div>`;

  document.body.appendChild(popup);

  // Position near click
  const clickEvt = window.event;
  const cx = clickEvt ? clickEvt.clientX : window.innerWidth / 2;
  const cy = clickEvt ? clickEvt.clientY : 200;
  const pw = 270;
  let left = cx + 10;
  let top = cy + 10;
  if (left + pw > window.innerWidth - 10) left = cx - pw - 10;
  if (top + 260 > window.innerHeight - 10) top = window.innerHeight - 270;
  popup.style.left = left + "px";
  popup.style.top = top + "px";

  // Close on outside click
  setTimeout(() => {
    document.addEventListener("click", function closePopup(evt) {
      if (!popup.contains(evt.target)) {
        popup.remove();
        document.removeEventListener("click", closePopup);
      }
    });
  }, 0);
}

function openEdit(id) {
  // Coerce to number — onclick attributes pass strings in some browsers
  const _id = typeof id === "string" ? parseInt(id, 10) : id;
  let e = calEvents.find((x) => x.id === _id || x.id === id);

  // Fallback: slot events may have been re-injected with a new hash if task.id
  // changed since the last render. Try matching by first name in rendered element.
  if (!e) {
    const rendered = document.querySelector(`[onclick*="openEdit(${id})"]`);
    if (rendered) {
      const renderedText = rendered.textContent.toLowerCase();
      e = calEvents.find((x) =>
        x._fromSlot &&
        (x.name || "").split(" ")[0].length > 1 &&
        renderedText.includes((x.name || "").split(" ")[0].toLowerCase())
      ) || null;
    }
  }

  if (!e) {
    console.warn("[Calendar] openEdit: event not found", { id, _id, total: calEvents.length });
    showCalToast("⚠️ Could not load event details. Try refreshing.");
    return;
  }
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
  const _evNameKey = (e.applicant_name || e.name || "").trim().toLowerCase();
  const _matchedTask =
    (e.taskId ? TASKS.find((t) => t.id === e.taskId) : null) ||
    (e.google_event_id
      ? TASKS.find((t) => t.gcalEventId === e.google_event_id)
      : null) ||
    (_evNameKey
      ? TASKS.find(
          (t) =>
            t.name.toLowerCase().includes(_evNameKey) ||
            _evNameKey.includes(t.name.toLowerCase()),
        )
      : null);
  const _editApplicantName = _matchedTask
    ? _matchedTask.applicant_name || _matchedTask.name || e.name
    : e.name;
  document.getElementById("cal-f-name").value = _editApplicantName;
  const _calSubheadEdit = document.getElementById("cal-modal-subhead");
  if (_calSubheadEdit) _calSubheadEdit.textContent = _editApplicantName || "Fill in the interview details below";
  _setField("cal-f-position", _matchedTask
    ? _matchedTask.position || e.position || ""
    : e.position || "");
  document.getElementById("cal-f-date").value = e.date;
  document.getElementById("cal-f-time").value =
    e.time || e.start_time || "09:00";
  document.getElementById("cal-f-end-time").value =
    e.end_time || autoEndTime(e.time || "09:00");
  // Slot events use "Interview" as type — map to closest valid option
  const _typeRaw = e.type || "Virtual";
  document.getElementById("cal-f-type").value =
    _typeRaw === "Interview" ? "Virtual" : _typeRaw;
  // Slot events use "Interview Slot" as round — map to Initial Interview
  const _roundRaw = e.round || e.interview_stage || "Initial Interview";
  _setField("cal-f-round", _roundRaw === "Interview Slot" ? "Initial Interview" : _roundRaw);
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
  _gsapModalOpen("cal-modal-overlay", "cal-modal");
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
    showCalToast("Zoom integration is not available. Paste a link manually.");
    return;
  } else if (_meetingPlatform === "meet") {
    if (gcalSignedIn) {
      // Real Meet room will be auto-created when the event is saved to GCal
      showCalToast(
        "💡 A real Google Meet room will be created automatically when you save.",
      );
      return;
    }
    // Can't generate a real Meet link without GCal OAuth — open meet.google.com/new
    // so the user can create a real room and paste the link
    window.open("https://meet.google.com/new", "_blank", "noopener");
    showCalToast("📋 Copy the link from Google Meet and paste it below.");
    return;
  }

  if (!url) return;
  input.value = url;
  anchor.href = url;
  anchor.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.914L15 14"/><rect x="1" y="6" width="15" height="12" rx="2"/></svg> Join Meeting`;
  preview.style.display = "block";
  updateMeetingLinkNote(url);
}

function openMeetingPlatform() {
  window.open("https://meet.google.com/new", "_blank", "noopener");
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
  _gsapModalClose("cal-modal-overlay", "cal-modal");
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

document.getElementById("cal-btn-save")?.addEventListener("click", async () => {
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
      try {
        await gcalUpdateEvent(ev);
      } catch (err) {
        console.warn("[GCal] Update failed:", err);
        showCalToast("⚠️ Saved locally. Google Calendar sync failed.");
      }
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
    Completed: "Endorsed", // Interview done → move to Endorsed for client review
    Cancelled: "Closed",   // Cancelled interview → close the application
    Rescheduled: "In Progress",
    Scheduled: "In Progress",
    "No Show": "Closed",   // No-show → close
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
      match.status !== "Cancelled" &&
      match.status !== "Closed"
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
      status: newStatus || "New",
      priority: "Medium",
      position: ev.position || "",
      assignee: ev.interviewer || "Assistant",
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
document.getElementById("cal-prev")?.addEventListener("click", () => {
  if (calView === "month") calDate.setMonth(calDate.getMonth() - 1);
  else if (calView === "week") calDate.setDate(calDate.getDate() - 7);
  else calDate.setDate(calDate.getDate() - 1);
  calDate = new Date(calDate);
  renderCalendar();
});
document.getElementById("cal-next")?.addEventListener("click", () => {
  if (calView === "month") calDate.setMonth(calDate.getMonth() + 1);
  else if (calView === "week") calDate.setDate(calDate.getDate() + 7);
  else calDate.setDate(calDate.getDate() + 1);
  calDate = new Date(calDate);
  renderCalendar();
});
document.getElementById("cal-today")?.addEventListener("click", () => {
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
  if (!el) return;
  const ROLE_COLORS = {
    Administrator: "#6c63ff",
    "HR Manager": "#44d7e9",
    Recruiter: "#43e97b",
    Reviewer: "#fa8231",
    Interviewer: "#ff6584",
    Admin: "#9ca3af",
  };
  el.innerHTML =
    MEMBERS.map(
      (m, i) => `
    <div class="member-row">
      <div class="assignee-avatar" style="background:${m.color};width:36px;height:36px;font-size:12px;flex-shrink:0;">${initials(m.name)}</div>
      <div class="member-info">
        <div class="member-name">${sanitize(m.name)}</div>
        <div style="font-size:11px;color:var(--light);margin-top:1px;">${sanitize(m.email)}</div>
      </div>
      <span class="member-role-badge" style="background:${ROLE_COLORS[m.role] || "#9ca3af"}22;color:${ROLE_COLORS[m.role] || "#9ca3af"};">${sanitize(m.role)}</span>
      <div class="member-actions">
        <button class="member-action-btn" data-action="editMember" data-arg="${i}" data-role-hide="hr">Edit</button>
        <button class="member-action-btn" style="color:#ef4444;border-color:#fca5a5;" data-action="removeMember" data-arg="${i}" data-role-hide="hr">Remove</button>
      </div>
    </div>`,
    ).join("") +
    `<button class="btn-add-member" data-action="addMember" data-role-hide="hr" style="margin-top:10px;width:100%;padding:8px;border:1.5px dashed var(--border);border-radius:10px;background:transparent;color:var(--muted);cursor:pointer;font-size:12px;font-weight:600;">+ Add Member</button>`;
}

/* ── Rebuild assignee options in modal ── */
function _rebuildAssigneeOptions() {
  const list = document.getElementById("assignee-checkbox-list");
  if (!list) return;
  list.innerHTML = MEMBERS.map(
    (m) => `
    <label class="assignee-check-item">
      <input type="checkbox" name="f-assignees" value="${sanitize(m.name)}"/>
      <div class="assignee-avatar" style="background:${m.color};width:22px;height:22px;font-size:9px;flex-shrink:0;">${initials(m.name)}</div>
      <span style="font-size:12px;">${sanitize(m.name)}</span>
      <span style="font-size:10px;color:var(--muted);margin-left:auto;">${sanitize(m.role)}</span>
    </label>`,
  ).join("");
}

/* ── Render notification panel ── */
function renderNotifPanel() {
  const el = document.getElementById("notif-panel-list");
  if (!el) return;
  if (!NOTIFS.length) {
    el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px;">No notifications yet</div>`;
    return;
  }
  const typeIcon = {
    stage: "📋",
    overdue: "⚠️",
    comment: "💬",
    attachment: "📎",
    attachment_deleted: "🗑️",
  };
  el.innerHTML = NOTIFS.map(
    (n) => `
    <div class="notif-item${n.read ? "" : " notif-unread"}">
      <span class="notif-icon">${typeIcon[n.type] || "🔔"}</span>
      <div class="notif-body">
        <div class="notif-msg">${sanitize(n.msg)}</div>
        <div class="notif-time">${_relTime(n.createdAt)}</div>
      </div>
      <button class="notif-dismiss" data-action="dismissNotif" data-arg="${n.id}" title="Dismiss">×</button>
    </div>`,
  ).join("");
}
function _relTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── Render Activity tab ── */
function renderActivityTab(task) {
  const el = document.getElementById("tab-activity-feed");
  if (!el) return;
  const all = [
    ...(task.activity || []).map((a) => ({ ...a, _isAct: true })),
    ...(task.comments || []).map((c) => ({ ...c, _isComment: true })),
  ].sort(
    (a, b) => new Date(a.at || a.createdAt) - new Date(b.at || b.createdAt),
  );

  const actLabel = {
    stage_change: "moved to stage",
    comment: "commented",
    attachment: "attached a file",
    attachment_deleted: "deleted a file",
  };
  el.innerHTML = all.length
    ? all
        .map((item) => {
          if (item._isComment) {
            return `<div class="activity-item activity-comment">
        <div class="activity-avatar">${initials(item.author || "?")}</div>
        <div class="activity-content">
          <div class="activity-author">${sanitize(item.author)}</div>
          <div class="comment-bubble">${sanitize(item.text)}</div>
          <div class="activity-time">${_relTime(item.createdAt)}</div>
        </div>
      </div>`;
          }
          return `<div class="activity-item">
      <div class="activity-dot"></div>
      <div class="activity-content">
        <span class="activity-author">${sanitize(item.by)}</span>
        <span class="activity-action"> ${actLabel[item.action] || item.action}</span>
        ${item.detail ? `<span class="activity-detail"> — ${sanitize(item.detail)}</span>` : ""}
        <div class="activity-time">${_relTime(item.at)}</div>
      </div>
    </div>`;
        })
        .join("")
    : `<div style="padding:20px;text-align:center;color:var(--muted);font-size:12px;">No activity yet</div>`;
}

/* ── Render Files tab ── */
function renderFilesTab(task) {
  const el = document.getElementById("tab-files-content");
  if (!el) return;
  const folderUrl = (task.drive_folder_link || "").trim();
  if (folderUrl) {
    el.innerHTML = `
      <div style="padding:20px 0;">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Applicant Drive Folder</div>
        <a href="${sanitize(folderUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;background:rgba(67,233,123,0.08);border:1px solid #43e97b;border-radius:8px;color:#43e97b;font-size:12px;font-weight:600;text-decoration:none;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          Open in Google Drive
        </a>
        <div style="margin-top:8px;font-size:10px;color:var(--muted);">Files are managed directly in Google Drive.</div>
      </div>`;
  } else {
    el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px;">No Drive folder linked for this applicant.</div>`;
  }
}

/* ── Render History (Stage Audit Log) tab ── */
function renderHistoryTab(task) {
  const el = document.getElementById("tab-history-timeline");
  if (!el) return;
  const history = task.stage_history || [];
  if (!history.length) {
    el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px;font-family:'Montserrat',sans-serif;">No stage transitions recorded yet.</div>`;
    return;
  }
  el.innerHTML = [...history]
    .reverse()
    .map((entry, i) => {
      const sm = (typeof STATUS_META !== "undefined" &&
        STATUS_META[entry.to]) || { color: "var(--cyan)" };
      const dateStr = new Date(entry.at).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `<div class="sh-entry">
      <div class="sh-dot" style="background:${sm.color};${i === 0 ? "box-shadow:0 0 0 3px " + sm.color + "33;" : ""}"></div>
      <div class="sh-content">
        <div class="sh-stage" style="color:${sm.color};">${sanitize(entry.to)}</div>
        <div class="sh-meta">from <strong>${sanitize(entry.from)}</strong> &nbsp;·&nbsp; ${sanitize(entry.by)}</div>
        <div class="sh-date">${dateStr}</div>
      </div>
    </div>`;
    })
    .join("");
}

/* ── Positions render ── */
function renderPositionsList(filter) {
  const el = document.getElementById("positions-list");
  const countEl = document.getElementById("position-count");
  if (countEl) countEl.textContent = POSITIONS.length;

  const q = (filter || "").toLowerCase();
  const filtered = POSITIONS.map((p, i) => ({ name: p, idx: i })).filter(
    (item) => !q || item.name.toLowerCase().includes(q),
  );

  if (filtered.length === 0) {
    el.innerHTML = `
      <div class="position-empty">
        <svg class="position-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          <line x1="12" y1="12" x2="12" y2="16"/>
          <line x1="10" y1="14" x2="14" y2="14"/>
        </svg>
        <div>${q ? "No positions match your search." : "No positions yet. Click <strong>Add Position</strong> to get started."}</div>
      </div>`;
    return;
  }

  // Sort alphabetically
  filtered.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  // Group by first letter
  const groups = {};
  for (const item of filtered) {
    const letter = item.name[0].toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(item);
  }

  const sortedLetters = Object.keys(groups).sort();

  el.innerHTML = sortedLetters
    .map(
      (letter) => `
    <div class="position-group">
      <div class="position-group-header">${letter}</div>
      <div class="position-grid">
        ${groups[letter]
          .map(
            (item) => `
          <div class="position-chip">
            <span>${sanitize(item.name)}</span>
            <button class="position-chip-remove" onclick="removePosition(${item.idx})" title="Remove">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>`,
          )
          .join("")}
      </div>
    </div>`,
    )
    .join("");
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
    renderPositionsList(
      document.getElementById("position-search")?.value || "",
    );
    showToast("🗑️ Position removed.");
  }
}

/* ── Position add (inline) ── */
document.getElementById("add-position-btn")?.addEventListener("click", () => {
  const row = document.getElementById("position-add-row");
  const inp = document.getElementById("position-add-input");
  row.classList.add("visible");
  inp.value = "";
  inp.focus();
});

function confirmAddPosition() {
  const inp = document.getElementById("position-add-input");
  const name = inp.value.trim();
  if (name) {
    POSITIONS.push(name);
    renderPositionsList(
      document.getElementById("position-search")?.value || "",
    );
    showToast("✅ Position added!");
  }
  inp.value = "";
  document.getElementById("position-add-row").classList.remove("visible");
}

document
  .getElementById("position-add-confirm")
  ?.addEventListener("click", confirmAddPosition);
document.getElementById("position-add-cancel")?.addEventListener("click", () => {
  document.getElementById("position-add-row")?.classList.remove("visible");
  const inp = document.getElementById("position-add-input");
  if (inp) inp.value = "";
});
document
  .getElementById("position-add-input")
  ?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmAddPosition();
    if (e.key === "Escape") {
      document.getElementById("position-add-row")?.classList.remove("visible");
      const inp = document.getElementById("position-add-input");
      if (inp) inp.value = "";
    }
  });

/* ── Position search ── */
document.getElementById("position-search")?.addEventListener("input", (e) => {
  renderPositionsList(e.target.value);
});


/* ── Assignee dropdown toggle ── */
document.addEventListener("click", function (e) {
  const toggle = e.target.closest("#assignee-dropdown-toggle");
  const panel = document.getElementById("assignee-dropdown-panel");
  if (!panel) return;
  if (toggle) {
    panel.style.display = panel.style.display === "block" ? "none" : "block";
  } else if (!e.target.closest("#assignee-dropdown-panel")) {
    panel.style.display = "none";
  }
});
document.addEventListener("change", function (e) {
  if (e.target.name === "f-assignees") _updateAssigneeDropdownLabel();
});

/* ── Reset demo data ── */

/* ══════════════════════════════════════════════
   SETTINGS — data-action dispatcher
   Handles all buttons in Settings panels
   that use data-action attributes.
══════════════════════════════════════════════ */
(function () {
  const LS_PROFILE = "upstaff_profile";
  const LS_WORKSPACE = "upstaff_workspace";
  const LS_NOTIFS = "upstaff_notifications";

  // Called by onclick="saveProfileSettings()" on the Save Profile button
  window.saveProfileSettings = function () {
    const pInputs = document.querySelectorAll(
      "#setting-profile .settings-input",
    );
    const pSelects = document.querySelectorAll(
      "#setting-profile .settings-select",
    );
    const profile = {
      firstName: pInputs[0]?.value.trim() || "",
      lastName: pInputs[1]?.value.trim() || "",
      email: pInputs[2]?.value.trim() || "",
      jobTitle: pInputs[3]?.value.trim() || "",
    };
    if (!profile.firstName || !profile.email)
      return showToast("⚠️ First name and email are required.");
    localStorage.setItem(LS_PROFILE, JSON.stringify(profile));

    // Save timezone + dateFormat to workspace key
    const ws = JSON.parse(localStorage.getItem(LS_WORKSPACE) || "{}");
    ws.timezone =
      document.getElementById("s-ws-timezone")?.value || ws.timezone || "";
    ws.dateFormat =
      document.getElementById("s-ws-dateformat")?.value || ws.dateFormat || "";
    localStorage.setItem(LS_WORKSPACE, JSON.stringify(ws));

    // Update avatar display
    const avatarEl = document.getElementById("profile-avatar-circle");
    const fullName = `${profile.firstName} ${profile.lastName}`.trim();
    if (avatarEl && fullName) {
      try {
        const cfg = JSON.parse(
          localStorage.getItem("upstaff_api_config") || "{}",
        );
        if (cfg.picture) {
          const initials = fullName
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          avatarEl.innerHTML = `<img src="${cfg.picture}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;" onerror="this.parentElement.textContent='${initials}'"/>`;
        } else {
          avatarEl.textContent = fullName
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
        }
      } catch (_) {}
    }

    // Update header display name
    const displayNameEl = document.getElementById("profile-display-name");
    if (displayNameEl && fullName) displayNameEl.textContent = fullName;
    showToast("✅ Profile saved!");
  };

  // Repopulate Settings fields from localStorage
  window._settingsLoad = function () {
    // ── Profile ──
    const profile = JSON.parse(localStorage.getItem(LS_PROFILE) || "{}");
    const pInputs = document.querySelectorAll(
      "#setting-profile .settings-input",
    );
    const pFields = ["firstName", "lastName", "email", "jobTitle"];
    pFields.forEach((f, i) => {
      if (pInputs[i] && profile[f]) pInputs[i].value = profile[f];
    });
    const pSelects = document.querySelectorAll(
      "#setting-profile .settings-select",
    );
    if (pSelects[0] && profile.role) pSelects[0].value = profile.role;

    // ── Profile: timezone + date format (stored in upstaff_workspace) ──
    const ws = JSON.parse(localStorage.getItem(LS_WORKSPACE) || "{}");
    const tzSel = document.getElementById("s-ws-timezone");
    const dfSel = document.getElementById("s-ws-dateformat");
    if (tzSel && ws.timezone) tzSel.value = ws.timezone;
    if (dfSel && ws.dateFormat) dfSel.value = ws.dateFormat;

    // ── Profile: Show Google profile picture if available ──
    try {
      const cfg = JSON.parse(
        localStorage.getItem("upstaff_api_config") || "{}",
      );
      const avatarEl = document.getElementById("profile-avatar-circle");
      if (avatarEl && cfg.picture) {
        avatarEl.innerHTML = `<img src="${cfg.picture}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;" onerror="this.parentElement.textContent=this.parentElement.dataset.initials||'HR'"/>`;
        // Pre-fill name fields from Google if profile fields are still empty
        if (!pInputs[0]?.value && cfg.name) {
          const parts = cfg.name.trim().split(" ");
          if (pInputs[0]) pInputs[0].value = parts[0] || "";
          if (pInputs[1]) pInputs[1].value = parts.slice(1).join(" ") || "";
        }
        if (!pInputs[2]?.value && cfg.email) {
          if (pInputs[2]) pInputs[2].value = cfg.email;
        }
      }
      // Auto-reflect role from Google auth
      if (cfg.role) {
        const roleLabel = cfg.role === "hr" ? "HR Manager" : cfg.role === "assistant" ? "Assistant" : cfg.role;
        const roleDisplayEl = document.getElementById("profile-display-role");
        if (roleDisplayEl) roleDisplayEl.textContent = roleLabel + " · upstaff";
        const roleSelectEl = document.getElementById("s-profile-role");
        if (roleSelectEl) roleSelectEl.value = roleLabel;
      }
    } catch (_) {}

    // Re-apply compact mode on load
    document.body.classList.toggle("compact-mode", !!ws.compactMode);

    // ── Notifications ──
    const notifs = JSON.parse(localStorage.getItem(LS_NOTIFS) || "{}");
    const nKeys = [
      "taskAssigned",
      "taskDueSoon",
      "interviewScheduled",
      "interviewChanged",
      "newApplicant",
      "emailDigest",
    ];
    const nToggles = document.querySelectorAll(
      "#setting-notifications .toggle-switch input",
    );
    nToggles.forEach((t, i) => {
      if (notifs[nKeys[i]] !== undefined) t.checked = notifs[nKeys[i]];
    });
  };

  // Global click delegation for all Settings data-action buttons
  const settingsPanel = document.getElementById("view-settings");
  if (!settingsPanel) return;

  settingsPanel.addEventListener("click", async function (e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;

    // ── Profile: Change Photo ──
    if (action === "toastPhotoUpload") {
      showToast("📷 Photo upload coming soon!");

      // ── Profile: Save Changes ──
    } else if (action === "toastProfileSaved") {
      const pInputs = document.querySelectorAll(
        "#setting-profile .settings-input",
      );
      const pSelects = document.querySelectorAll(
        "#setting-profile .settings-select",
      );
      const profile = {
        firstName: pInputs[0]?.value.trim() || "",
        lastName: pInputs[1]?.value.trim() || "",
        email: pInputs[2]?.value.trim() || "",
        jobTitle: pInputs[3]?.value.trim() || "",
        role: pSelects[0]?.value || "Administrator",
      };
      if (!profile.firstName || !profile.email)
        return showToast("⚠️ First name and email are required.");
      localStorage.setItem(LS_PROFILE, JSON.stringify(profile));

      // Also save timezone + dateFormat to workspace key
      const ws = JSON.parse(localStorage.getItem(LS_WORKSPACE) || "{}");
      ws.timezone =
        document.getElementById("s-ws-timezone")?.value || ws.timezone || "";
      ws.dateFormat =
        document.getElementById("s-ws-dateformat")?.value ||
        ws.dateFormat ||
        "";
      localStorage.setItem(LS_WORKSPACE, JSON.stringify(ws));

      // Update avatar: show initials (picture is set separately from Google login)
      const avatarEl = document.getElementById("profile-avatar-circle");
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();
      if (avatarEl && fullName) {
        const cfg = JSON.parse(
          localStorage.getItem("upstaff_api_config") || "{}",
        );
        if (cfg.picture) {
          avatarEl.innerHTML = `<img src="${cfg.picture}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;" onerror="this.parentElement.textContent='${fullName
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)}'"/>`;
        } else {
          avatarEl.textContent = fullName
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
        }
      }
      showToast("✅ Profile saved!");

      // ── EmailJS: Save Config ──
    } else if (action === "saveEmailJSConfig") {
      saveEmailJSConfig();
      showToast("✅ Email settings saved!");

      // ── Storage: Refresh Status ──
    } else if (action === "refreshStorageStatus") {
      refreshStorageStatus();

      // ── Workspace: Save Changes ──
    } else if (action === "toastWorkspaceSaved") {
      const wsInputs = document.querySelectorAll(
        "#setting-workspace .settings-input",
      );
      const wsSelects = document.querySelectorAll(
        "#setting-workspace .settings-select",
      );
      const defView = document.querySelector(
        "#setting-workspace select[style*='auto']",
      );
      const wsToggles = document.querySelectorAll(
        "#setting-workspace .toggle-switch input",
      );
      const ws = {
        companyName: wsInputs[0]?.value.trim() || "",
        industry: wsSelects[0]?.value || "",
        companySize: wsSelects[1]?.value || "",
        timezone: wsSelects[2]?.value || "",
        dateFormat: wsSelects[3]?.value || "",
        defaultView: defView?.value || "List",
        compactMode: wsToggles[0]?.checked || false,
        showCompleted: wsToggles[1]?.checked !== false,
      };
      localStorage.setItem(LS_WORKSPACE, JSON.stringify(ws));
      document.body.classList.toggle("compact-mode", ws.compactMode);
      showToast("✅ Workspace settings saved!");

      // ── Members: Invite ──
    } else if (action === "toastInviteSent") {
      showToast("📨 Invite sent! (Member management coming soon)");

      // ── Notifications: Save ──
    } else if (action === "toastNotifSaved") {
      const nKeys = [
        "taskAssigned",
        "taskDueSoon",
        "interviewScheduled",
        "interviewChanged",
        "newApplicant",
        "emailDigest",
      ];
      const nToggles = document.querySelectorAll(
        "#setting-notifications .toggle-switch input",
      );
      const notifs = {};
      nKeys.forEach((k, i) => {
        notifs[k] = nToggles[i]?.checked || false;
      });
      localStorage.setItem(LS_NOTIFS, JSON.stringify(notifs));
      showToast("🔔 Notification preferences saved!");

      // ── Danger: Clear All Tasks ──
    } else if (action === "handleClearTasks") {
      if (
        !(await uiConfirm(
          "This will permanently delete ALL tasks in the workspace.",
          {
            icon: "🗑️",
            title: "Clear All Tasks?",
            okText: "Clear Tasks",
            okDanger: true,
          },
        ))
      )
        return;
      TASKS = [];
      taskNextId = 100;
      persistSave();
      refreshCurrentView();
      showToast("🗑️ All tasks cleared.");

      // ── Danger: Clear Interview Calendar ──
    } else if (action === "handleClearCalendar") {
      if (
        !(await uiConfirm(
          "This will remove all locally created calendar events. Google Calendar events are unaffected.",
          {
            icon: "📅",
            title: "Clear Interview Calendar?",
            okText: "Clear Calendar",
            okDanger: true,
          },
        ))
      )
        return;
      calEvents = calEvents.filter((ev) => ev.isGoogleEvent);
      persistSave();
      renderCalendar();
      showToast("📅 Local calendar events cleared.");

      // ── Danger: Wipe All Storage ──
    } else if (action === "handleWipeStorage") {
      if (
        !(await uiConfirm(
          "This wipes EVERYTHING — tasks, employees, events, and Google auth. The page will reload.",
          {
            icon: "⚠️",
            title: "Wipe All Storage?",
            okText: "Wipe Everything",
            okDanger: true,
          },
        ))
      )
        return;
      localStorage.clear();
      location.reload();

      // ── Backup: Export JSON ──
    } else if (action === "exportDataJSON") {
      exportDataJSON();

      // ── Calendars: Subscribe External ──
    } else if (action === "subscribeCustomExtCalendar") {
      if (typeof subscribeCustomExtCalendar === "function")
        subscribeCustomExtCalendar();
    }
  });
})();

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

async function renderSearchResults(q) {
  const el = document.getElementById("search-results");
  const query = q.trim().toLowerCase();

  if (!query) {
    el.innerHTML = `<div class="search-empty">Start typing to search applicants, positions, or assignees…</div>`;
    return;
  }

  // Calendar hits are always local
  const calHits = calEvents
    .filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.position.toLowerCase().includes(query) ||
        e.round.toLowerCase().includes(query) ||
        e.interviewer.toLowerCase().includes(query),
    )
    .slice(0, 4);

  // Use API search when connected, otherwise filter local TASKS
  let taskHits = [];
  if (window.UpstaffAPI && UpstaffAPI.isConfigured()) {
    el.innerHTML = `<div class="search-empty" style="color:var(--muted);">🔍 Searching database…</div>`;
    try {
      const res = await UpstaffAPI.search(q);
      if (res.data && res.data.length) {
        // Map API records and assign temporary display IDs
        let tmpId = 900000;
        taskHits = res.data
          .map((r) => {
            // Find if already in local TASKS (matched by email)
            const local = TASKS.find((t) => t.applicant_email === r.email);
            return local || UpstaffAPI.mapApplicant(r, tmpId++);
          })
          .slice(0, 8);
      }
    } catch (e) {
      // Fall back to local on API error
      taskHits = TASKS.filter(
        (t) =>
          (t.name || "").toLowerCase().includes(query) ||
          (t.position || "").toLowerCase().includes(query) ||
          (t.status || "").toLowerCase().includes(query),
      ).slice(0, 8);
    }
  } else {
    taskHits = TASKS.filter(
      (t) =>
        (t.name || "").toLowerCase().includes(query) ||
        (t.position || "").toLowerCase().includes(query) ||
        (t.assignee || "").toLowerCase().includes(query) ||
        (t.status || "").toLowerCase().includes(query) ||
        (t.priority || "").toLowerCase().includes(query),
    ).slice(0, 8);
  }

  if (!taskHits.length && !calHits.length) {
    el.innerHTML = `<div class="search-empty">No results for "<strong>${sanitize(q)}</strong>"</div>`;
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
  ?.addEventListener("click", function (e) {
    if (e.target === this) closeGlobalSearch();
  });
document.getElementById("global-search-input")?.addEventListener(
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
   [SECTION: ANALYTICS] — Applicant Analytics & Charts
══════════════════════════════════════════════ */

// APPLICANT_DATA removed — analytics now reads live data from TASKS.
// Fields like source, employmentType, workSetup, workSchedule, education,
// tools, and skills will be populated once the database integration is live.

/* ── ApexCharts instances (destroyed & re-created on each renderAnalytics call) ── */
let _apexCharts = [];

/* ── SortableJS instances (destroyed & re-created on each renderBoard call) ── */
let _sortables = [];

/* ── ApexCharts theme helper ── */
function _getApexTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  return {
    isDark,
    mode: isDark ? "dark" : "light",
    foreColor: isDark ? "#cbd5e1" : "#475569",
    borderColor: isDark ? "#2d3f55" : "#c9cfd9",
  };
}

/* ── GSAP modal helpers ── */
function _gsapModalOpen(overlayId, modalId) {
  const overlay = document.getElementById(overlayId);
  const modal   = document.getElementById(modalId);
  if (!overlay || !modal) return;
  overlay.classList.add("open");
  if (!window.gsap) return;
  gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" });
  gsap.fromTo(modal,   { opacity: 0, y: 14, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: "power3.out" });
}
function _gsapModalClose(overlayId, modalId, onComplete) {
  const overlay = document.getElementById(overlayId);
  const modal   = document.getElementById(modalId);
  if (!overlay || !modal) { onComplete && onComplete(); return; }
  if (!window.gsap) {
    overlay.classList.remove("open");
    onComplete && onComplete();
    return;
  }
  gsap.to(modal,   { opacity: 0, y: 8, scale: 0.97, duration: 0.18, ease: "power2.in" });
  gsap.to(overlay, { opacity: 0, duration: 0.18, ease: "power2.in", onComplete: () => {
    overlay.classList.remove("open");
    gsap.set([overlay, modal], { clearProps: "all" });
    onComplete && onComplete();
  }});
}

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
    container.innerHTML = '<div class="u-no-data">No data</div>';
    return;
  }

  const R = 54,
    r = 34,
    cx = 60,
    cy = 60;
  let angle = -Math.PI / 2; // start at top

  const slices = data.map((d, i) => {
    // ── Single-item (100%) fix ──────────────────────────────────────
    // SVG arcs with identical start & end points render nothing.
    // Clamp sweep just under 2π so the arc stays visible.
    const sweep = Math.min(
      (d.value / total) * 2 * Math.PI,
      2 * Math.PI - 0.0001,
    );

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

  // Track ring: light background ring so single-color donuts have visible depth
  const trackPath = `M${cx.toFixed(2)},${(cy - R).toFixed(2)} A${R},${R} 0 1,1 ${(cx - 0.01).toFixed(2)},${(cy - R).toFixed(2)} Z`;
  const holePath = `M${cx.toFixed(2)},${(cy - r).toFixed(2)} A${r},${r} 0 1,1 ${(cx - 0.01).toFixed(2)},${(cy - r).toFixed(2)} Z`;

  const svg = `<svg width="120" height="120" viewBox="0 0 120 120" style="flex-shrink:0;">
    <!-- background track ring -->
    <path d="${trackPath}" fill="currentColor" style="fill:var(--border,rgba(0,0,0,.08));opacity:.5;"/>
    <!-- donut slices -->
    ${slices.map((s) => `<path d="${s.path}" fill="${s.color}" opacity=".92"/>`).join("")}
    <!-- centre hole — must use --surface-1 (not --surface which is undefined) -->
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" style="fill:var(--surface-1,#ffffff);"/>
    <!-- centre labels — drawn last so they sit on top of the hole -->
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="800" font-family="Syne,sans-serif" fill="currentColor" style="fill:var(--text);">${total}</text>
    <text x="${cx}" y="${cy + 11}" text-anchor="middle" dominant-baseline="middle" font-size="8" font-weight="700" font-family="Montserrat,sans-serif" fill="currentColor" style="fill:var(--muted);letter-spacing:.08em;">TOTAL</text>
  </svg>`;

  const legend = `<div class="donut-legend">${slices
    .map(
      (s) => `<div class="donut-legend-item">
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

  // Resolve icon — handles exact match AND prefix match (e.g. "Referral [code]")
  function _srcIcon(label) {
    const exact = {
      Facebook: "👍",
      LinkedIn: "💼",
      Instagram: "📸",
      TikTok: "🎵",
      Twitter: "🐦",
      JobStreet: "🔎",
      Indeed: "🔍",
      Kalibrr: "🎯",
      Referral: "🤝",
      "Company Website": "🌐",
      "Walk-in": "🚶",
      Other: "❓",
    };
    if (exact[label]) return exact[label];
    // Prefix match: "Referral [yangyang]" → 🤝
    const lower = label.toLowerCase();
    if (lower.startsWith("referral")) return "🤝";
    if (lower.startsWith("facebook")) return "👍";
    if (lower.startsWith("linkedin")) return "💼";
    if (lower.startsWith("instagram")) return "📸";
    if (lower.startsWith("tiktok")) return "🎵";
    if (lower.startsWith("jobstreet")) return "🔎";
    if (lower.startsWith("indeed")) return "🔍";
    if (lower.startsWith("walk")) return "🚶";
    if (lower.includes("website") || lower.includes("web")) return "🌐";
    return "📣";
  }

  if (!data.length) {
    container.innerHTML = '<div class="u-no-data">No data</div>';
    return;
  }

  container.innerHTML = data
    .map((d) => {
      const pct = total ? Math.round((d.value / total) * 100) : 0;
      return `<div class="source-row">
      <div class="source-icon">${_srcIcon(d.label)}</div>
      <div class="source-label">${d.label}</div>
      <div class="source-bar-track"><div class="source-bar-fill" style="width:${pct}%;"></div></div>
      <div class="source-pct">${pct}%</div>
      <div class="source-count">${d.value}</div>
    </div>`;
    })
    .join("");
}

/* ── Main render function for the Analytics view ── */
function renderAnalytics() {
  // Destroy previous ApexCharts instances to prevent memory leaks
  _apexCharts.forEach(c => { try { c.destroy(); } catch (_) {} });
  _apexCharts = [];

  const A = TASKS;
  const total = A.length;
  const { isDark, mode: _apexMode, foreColor: _apexFore, borderColor: _apexBorder } = _getApexTheme();

  /* ── 1. KPI cards ── */
  const hiredCount = A.filter(
    (t) => t.status === "Hired" || t.partner_status === "Hired",
  ).length;
  const rejectedCount = A.filter(
    (t) => t.status === "Rejected" || t.partner_status === "Rejected",
  ).length;
  const activeCount = A.filter(
    (t) => !["Hired", "Closed", "Rejected", "Cancelled"].includes(t.status),
  ).length;
  const interviewedCount = A.filter(
    (t) =>
      t.partner_status === "Interviewed" ||
      t.status === "In Progress" ||
      t.status === "Endorsed",
  ).length;
  const hireRate = total > 0 ? Math.round((hiredCount / total) * 100) : 0;
  const rejRate = total > 0 ? Math.round((rejectedCount / total) * 100) : 0;

  // Time-to-hire: days from application_date (or start) to hired_at
  const _tthData = A.filter((t) => t.hired_at && (t.application_date || t.start))
    .map((t) => {
      const a = new Date(t.application_date || t.start);
      const h = new Date(t.hired_at);
      return isNaN(a) || isNaN(h) ? null : Math.max(0, Math.round((h - a) / 86400000));
    })
    .filter((d) => d !== null);
  const avgTTH = _tthData.length
    ? Math.round(_tthData.reduce((s, d) => s + d, 0) / _tthData.length)
    : null;
  const minTTH = _tthData.length ? Math.min(..._tthData) : null;
  const maxTTH = _tthData.length ? Math.max(..._tthData) : null;

  const _kpiEl = document.getElementById("analytics-kpi-row");
  if (_kpiEl) {
    _kpiEl.innerHTML = `
    <div class="analytics-stat-card">
      <div class="analytics-stat-icon" style="background:rgba(68,215,233,.12);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#44d7e9" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
      </div>
      <div class="analytics-stat-value">${total}</div>
      <div class="analytics-stat-label">Total Applicants</div>
      <div class="analytics-stat-sub">All time</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-icon" style="background:rgba(68,215,233,.10);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#44d7e9" stroke-width="2.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </div>
      <div class="analytics-stat-value">${activeCount}</div>
      <div class="analytics-stat-label">Active Pipeline</div>
      <div class="analytics-stat-sub">Currently in process</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-icon" style="background:rgba(67,233,123,.12);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#43e97b" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="analytics-stat-value">${hiredCount}</div>
      <div class="analytics-stat-label">Hired</div>
      <div class="analytics-stat-sub">Hire rate: ${hireRate}%</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-icon" style="background:rgba(239,68,68,.10);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
      <div class="analytics-stat-value">${rejectedCount}</div>
      <div class="analytics-stat-label">Rejected</div>
      <div class="analytics-stat-sub">Rejection rate: ${rejRate}%</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-icon" style="background:rgba(108,99,255,.12);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
      </div>
      <div class="analytics-stat-value">${interviewedCount}</div>
      <div class="analytics-stat-label">Interviewed</div>
      <div class="analytics-stat-sub">In Progress + Endorsed stage</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-icon" style="background:rgba(250,130,49,.12);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fa8231" stroke-width="2.5" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      </div>
      <div class="analytics-stat-value">${[...new Set(A.map((a) => a.position).filter(Boolean))].length}</div>
      <div class="analytics-stat-label">Positions Open</div>
      <div class="analytics-stat-sub">Unique roles applied</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-icon" style="background:rgba(251,191,36,.12);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </div>
      <div class="analytics-stat-value">${avgTTH !== null ? avgTTH + "d" : "—"}</div>
      <div class="analytics-stat-label">Avg. Time to Hire</div>
      <div class="analytics-stat-sub">${_tthData.length ? `Min ${minTTH}d · Max ${maxTTH}d · ${_tthData.length} hired` : "No hire data yet"}</div>
    </div>`;
  }

  /* ── Time-to-hire per position breakdown ── */
  const _tthPosEl = document.getElementById("chart-time-to-hire");
  if (_tthPosEl) {
    const posMap = {};
    A.filter((t) => t.hired_at && (t.application_date || t.start) && t.position).forEach((t) => {
      const days = Math.max(0, Math.round((new Date(t.hired_at) - new Date(t.application_date || t.start)) / 86400000));
      if (!posMap[t.position]) posMap[t.position] = [];
      posMap[t.position].push(days);
    });
    const posRows = Object.entries(posMap)
      .map(([pos, days]) => ({ pos, avg: Math.round(days.reduce((s, d) => s + d, 0) / days.length), n: days.length }))
      .sort((a, b) => a.avg - b.avg);
    _tthPosEl.innerHTML = "";
    if (posRows.length) {
      const chart = new ApexCharts(_tthPosEl, {
        chart: { type: "bar", height: Math.max(posRows.length * 38 + 60, 120), background: "transparent", toolbar: { show: false } },
        series: [{ name: "Avg Days", data: posRows.map(r => r.avg) }],
        xaxis: { categories: posRows.map(r => r.pos), labels: { style: { fontSize: "11px", fontFamily: "Montserrat,sans-serif", colors: _apexFore } } },
        yaxis: { labels: { style: { fontSize: "11px", colors: _apexFore } } },
        plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
        colors: ["#f59e0b"],
        theme: { mode: _apexMode },
        dataLabels: { enabled: true, formatter: v => v + "d", style: { fontSize: "11px", fontWeight: 600 } },
        grid: { borderColor: _apexBorder },
        tooltip: { theme: _apexMode, y: { formatter: (v, { dataPointIndex }) => `${v}d avg · ${posRows[dataPointIndex].n} hire${posRows[dataPointIndex].n > 1 ? "s" : ""}` } },
      });
      chart.render();
      _apexCharts.push(chart);
    } else {
      _tthPosEl.innerHTML = `<p style="color:var(--muted);font-size:13px;text-align:center;padding:20px 0;">No hire data yet — time-to-hire will appear once applicants reach Hired stage.</p>`;
    }
  }

  /* ── 2. Pipeline funnel ── */
  const PIPELINE_STAGES = [
    { key: "For Interview", label: "For Interview", color: "#44d7e9" },
    { key: "Interviewed", label: "Interviewed", color: "#6c63ff" },
    {
      key: "For Client Endorsement",
      label: "For Client Endorsement",
      color: "#a78bfa",
    },
    { key: "Hired", label: "Hired", color: "#43e97b" },
    { key: "Hired - Resigned", label: "Hired - Resigned", color: "#fa8231" },
    {
      key: "Open for other roles",
      label: "Open for Other Roles",
      color: "#38bdf8",
    },
    {
      key: "Could be Revisited",
      label: "Could Be Revisited",
      color: "#60a5fa",
    },
    {
      key: "For Future Consideration",
      label: "For Future Consideration",
      color: "#94a3b8",
    },
    { key: "No Show", label: "No Show", color: "#fbbf24" },
    { key: "Not Qualified", label: "Not Qualified", color: "#64748b" },
    { key: "Duplicate Lead", label: "Duplicate Lead", color: "#c084fc" },
    { key: "Rejected", label: "Rejected", color: "#ef4444" },
  ];
  const pipelineEl = document.getElementById("chart-pipeline");
  if (pipelineEl) {
    const stageCounts = PIPELINE_STAGES.map((s) => ({
      ...s,
      count: A.filter((t) => t.partner_status === s.key || t.status === s.key).length,
    })).filter((s) => s.count > 0).sort((a, b) => b.count - a.count);
    pipelineEl.innerHTML = "";
    if (stageCounts.length) {
      const chart = new ApexCharts(pipelineEl, {
        chart: { type: "bar", height: Math.max(stageCounts.length * 38 + 60, 120), background: "transparent", toolbar: { show: false } },
        series: [{ name: "Applicants", data: stageCounts.map(s => s.count) }],
        xaxis: { categories: stageCounts.map(s => s.label), labels: { style: { fontSize: "11px", fontFamily: "Montserrat,sans-serif", colors: _apexFore } } },
        yaxis: { labels: { style: { fontSize: "11px", colors: _apexFore } } },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true } },
        colors: stageCounts.map(s => s.color),
        legend: { show: false },
        theme: { mode: _apexMode },
        dataLabels: { enabled: true, style: { fontSize: "11px", fontWeight: 600 } },
        grid: { borderColor: _apexBorder },
        tooltip: { theme: _apexMode, y: { formatter: v => `${v} (${total ? Math.round((v / total) * 100) : 0}%)` } },
      });
      chart.render();
      _apexCharts.push(chart);
    } else {
      pipelineEl.innerHTML = `<p style="color:var(--muted);font-size:13px;text-align:center;padding:20px 0;">No pipeline data yet</p>`;
    }
  }

  /* ── 3. Position summary table ── */
  const posCount = countBy(A.map((a) => a.position).filter(Boolean));
  const posEntries = Object.entries(posCount).sort((a, b) => b[1] - a[1]);
  const tableRows = posEntries
    .map(
      ([p, tot]) => `<tr>
    <td style="font-weight:600;">${p}</td>
    <td><span class="choice-badge" style="background:rgba(68,215,233,.15);color:#44d7e9;">${tot}</span></td>
    <td><strong>${tot}</strong></td>
  </tr>`,
    )
    .join("");

  document.getElementById("position-choice-table").innerHTML = `
    <thead><tr>
      <th>Position</th>
      <th>Applicants</th>
      <th>Total</th>
    </tr></thead>
    <tbody>${tableRows || '<tr><td colspan="3" class="u-text-center u-text-light" style="padding:16px;">No applicants yet</td></tr>'}</tbody>`;

  /* ── 4. Applicants per position bar chart (live from TASKS) ── */
  const posData = posEntries.map(([label, value]) => ({ label, value }));
  const _posEl = document.getElementById("chart-position");
  if (_posEl) {
    _posEl.innerHTML = "";
    if (posData.length) {
      const chart = new ApexCharts(_posEl, {
        chart: { type: "bar", height: Math.max(posData.length * 38 + 60, 120), background: "transparent", toolbar: { show: false } },
        series: [{ name: "Applicants", data: posData.map(d => d.value) }],
        xaxis: { categories: posData.map(d => d.label), labels: { style: { fontSize: "11px", fontFamily: "Montserrat,sans-serif", colors: _apexFore } } },
        yaxis: { labels: { style: { fontSize: "11px", colors: _apexFore } } },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true } },
        colors: CHART_COLORS,
        legend: { show: false },
        theme: { mode: _apexMode },
        dataLabels: { enabled: true, style: { fontSize: "11px", fontWeight: 600 } },
        grid: { borderColor: _apexBorder },
        tooltip: { theme: _apexMode },
      });
      chart.render();
      _apexCharts.push(chart);
    } else {
      _posEl.innerHTML = '<div class="u-no-data">No data</div>';
    }
  }

  /* ── 4–10. Extended fields — reads from TASKS if DB populates them,
     shows "No data" gracefully until then ── */

  // Split a bullet/comma list string into individual items.
  // Handles: "A, B, C"  |  "• A\n• B\n• C"  |  "A\nB\nC"
  // Defined first so it can be reused for all multi-value fields below.
  function splitItems(raw) {
    if (!raw) return [];
    if (Array.isArray(raw))
      return raw
        .map((s) =>
          s
            .toString()
            .replace(/^[•\-]\s*/, "")
            .trim(),
        )
        .filter(Boolean);
    return raw
      .split(/[\n,]+/)
      .map((s) => s.replace(/^[•\-]\s*/, "").trim())
      .filter(Boolean);
  }

  // ── Field name note ───────────────────────────────────────────────────────
  // The API mapper (pm-ui-api.js mapApplicant) stores fields as snake_case:
  //   employment_type, work_setup, work_schedule, education_level, referral_source
  // The Google Sheet can store multi-line bullet values (e.g. "• Full-Time\n• Part-Time")
  // so we use splitItems() to normalise them before counting.
  // ─────────────────────────────────────────────────────────────────────────

  // Employment type donut — normalise to handle both legacy and new form values
  const allEmpTypes = A.flatMap((t) => splitItems(t.employment_type)).map(
    (v) => {
      const n = v.toLowerCase();
      if (n.includes("full")) return "Full-time";
      if (n.includes("part")) return "Part-time";
      if (n.includes("contract")) return "Contract";
      if (n.includes("freelance")) return "Freelance";
      if (n.includes("project")) return "Project-based";
      return v;
    },
  );
  const empData = [
    "Full-time",
    "Part-time",
    "Contract",
    "Freelance",
    "Project-based",
  ]
    .map((l) => ({
      label: l,
      value: allEmpTypes.filter((v) => v === l).length,
    }))
    .filter((d) => d.value > 0);
  (function() {
    const el = document.getElementById("chart-employment");
    if (!el) return;
    el.innerHTML = "";
    if (!empData.length) { el.innerHTML = '<div class="u-no-data">No data</div>'; return; }
    const chart = new ApexCharts(el, {
      chart: { type: "donut", height: 220, background: "transparent", toolbar: { show: false } },
      series: empData.map(d => d.value),
      labels: empData.map(d => d.label),
      colors: ["#44d7e9","#6c63ff","#fa8231","#43e97b","#f472b6"],
      theme: { mode: _apexMode },
      dataLabels: { enabled: false },
      legend: { position: "bottom", fontSize: "11px", fontFamily: "Montserrat,sans-serif", labels: { colors: _apexFore } },
      plotOptions: { pie: { donut: { size: "65%", labels: { show: true, total: { show: true, label: "Total", fontSize: "11px", fontWeight: 600, color: _apexFore } } } } },
      stroke: { width: 0 },
      tooltip: { theme: _apexMode },
    });
    chart.render();
    _apexCharts.push(chart);
  })();

  // Work setup donut
  const allWorkSetups = A.flatMap((t) => splitItems(t.work_setup)).map((v) => {
    const n = v.toLowerCase();
    if (n.includes("on-site") || n.includes("onsite")) return "On-site";
    if (n.includes("remote")) return "Remote";
    if (n.includes("hybrid")) return "Hybrid";
    return v;
  });
  const setupData = ["On-site", "Remote", "Hybrid"]
    .map((l) => ({
      label: l,
      value: allWorkSetups.filter((v) => v === l).length,
    }))
    .filter((d) => d.value > 0);
  (function() {
    const el = document.getElementById("chart-setup");
    if (!el) return;
    el.innerHTML = "";
    if (!setupData.length) { el.innerHTML = '<div class="u-no-data">No data</div>'; return; }
    const chart = new ApexCharts(el, {
      chart: { type: "donut", height: 220, background: "transparent", toolbar: { show: false } },
      series: setupData.map(d => d.value),
      labels: setupData.map(d => d.label),
      colors: ["#fa8231","#44d7e9","#6c63ff"],
      theme: { mode: _apexMode },
      dataLabels: { enabled: false },
      legend: { position: "bottom", fontSize: "11px", fontFamily: "Montserrat,sans-serif", labels: { colors: _apexFore } },
      plotOptions: { pie: { donut: { size: "65%", labels: { show: true, total: { show: true, label: "Total", fontSize: "11px", fontWeight: 600, color: _apexFore } } } } },
      stroke: { width: 0 },
      tooltip: { theme: _apexMode },
    });
    chart.render();
    _apexCharts.push(chart);
  })();

  // Work schedule bar chart — matches new form dropdown values (includes time range)
  const allWorkSchedules = A.flatMap((t) => splitItems(t.work_schedule)).map(
    (v) => {
      const n = v.toLowerCase();
      if (n.includes("morning") || n.includes("7am")) return "Morning";
      if (n.includes("mid") || n.includes("10am")) return "Mid-shift";
      if (n.includes("night") || n.includes("9pm")) return "Night";
      if (n.includes("flexible")) return "Flexible";
      return v;
    },
  );
  const schedData = ["Morning", "Mid-shift", "Night", "Flexible"]
    .map((l) => ({
      label: l,
      value: allWorkSchedules.filter((v) => v === l).length,
    }))
    .filter((d) => d.value > 0);
  (function() {
    const el = document.getElementById("chart-schedule");
    if (!el) return;
    el.innerHTML = "";
    if (!schedData.length) { el.innerHTML = '<div class="u-no-data">No data</div>'; return; }
    const chart = new ApexCharts(el, {
      chart: { type: "bar", height: Math.max(schedData.length * 38 + 60, 120), background: "transparent", toolbar: { show: false } },
      series: [{ name: "Applicants", data: schedData.map(d => d.value) }],
      xaxis: { categories: schedData.map(d => d.label), labels: { style: { fontSize: "11px", fontFamily: "Montserrat,sans-serif", colors: _apexFore } } },
      yaxis: { labels: { style: { fontSize: "11px", colors: _apexFore } } },
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      colors: ["#6c63ff"],
      theme: { mode: _apexMode },
      dataLabels: { enabled: true, style: { fontSize: "11px", fontWeight: 600 } },
      grid: { borderColor: _apexBorder },
      tooltip: { theme: _apexMode },
    });
    chart.render();
    _apexCharts.push(chart);
  })();

  // Education bar chart — matches new form dropdown values
  const allEduLevels = A.map((t) => (t.education_level || "").trim())
    .map((v) => {
      const n = v.toLowerCase();
      if (n.includes("high school")) return "High School";
      if (
        n.includes("vocational") ||
        n.includes("technical") ||
        n.includes("tesda")
      )
        return "Vocational / Technical";
      if (n.includes("some college")) return "Some College";
      if (n.includes("bachelor")) return "Bachelor's Degree";
      if (n.includes("master")) return "Master's Degree";
      if (n.includes("doctorate") || n.includes("phd")) return "Doctorate";
      return v;
    })
    .filter(Boolean);
  const eduLabels = [
    "High School",
    "Vocational / Technical",
    "Some College",
    "Bachelor's Degree",
    "Master's Degree",
    "Doctorate",
  ];
  const eduData = eduLabels
    .map((l) => ({
      label: l,
      value: allEduLevels.filter((v) => v === l).length,
    }))
    .filter((d) => d.value > 0);
  (function() {
    const el = document.getElementById("chart-education");
    if (!el) return;
    el.innerHTML = "";
    if (!eduData.length) { el.innerHTML = '<div class="u-no-data">No data</div>'; return; }
    const chart = new ApexCharts(el, {
      chart: { type: "bar", height: Math.max(eduData.length * 38 + 60, 120), background: "transparent", toolbar: { show: false } },
      series: [{ name: "Applicants", data: eduData.map(d => d.value) }],
      xaxis: { categories: eduData.map(d => d.label), labels: { style: { fontSize: "11px", fontFamily: "Montserrat,sans-serif", colors: _apexFore } } },
      yaxis: { labels: { style: { fontSize: "11px", colors: _apexFore } } },
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      colors: ["#43e97b"],
      theme: { mode: _apexMode },
      dataLabels: { enabled: true, style: { fontSize: "11px", fontWeight: 600 } },
      grid: { borderColor: _apexBorder },
      tooltip: { theme: _apexMode },
    });
    chart.render();
    _apexCharts.push(chart);
  })();

  // Source list — reads t.referral_source (not t.source)
  const srcRaw = A.flatMap((t) => splitItems(t.referral_source));
  const srcData = Object.entries(countBy(srcRaw))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  buildSourceList(document.getElementById("chart-source"), srcData);

  // Tools tag cloud
  const allTools = A.flatMap((t) => splitItems(t.tools));
  buildTagCloud(
    document.getElementById("chart-tools"),
    Object.entries(countBy(allTools))
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
  );

  // Skills tag cloud
  const allSkills = A.flatMap((t) => splitItems(t.skills));
  buildTagCloud(
    document.getElementById("chart-skills"),
    Object.entries(countBy(allSkills))
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
  );
}

/* ── Analytics CSV Export ── */
function exportAnalyticsCSV() {
  const A = TASKS;
  const rows = [];
  const date = new Date().toISOString().slice(0, 10);
  const now = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });

  // Helper: split bullet/comma lists from sheet values
  function _sp(raw) {
    if (!raw) return [];
    return String(raw)
      .split(/[\n,]+/)
      .map((s) => s.replace(/^[•\-]\s*/, "").trim())
      .filter(Boolean);
  }
  // Helper: count occurrences in an array
  function _count(arr) {
    const m = {};
    arr.forEach((v) => {
      m[v] = (m[v] || 0) + 1;
    });
    return m;
  }
  // Helper: hire rate string
  function _rate(hired, total) {
    return total ? Math.round((hired / total) * 100) + "%" : "—";
  }

  // ── Cover ──────────────────────────────────────────────────────────────────
  rows.push(["UPSTAFF — Recruitment Analytics Report"]);
  rows.push(["Exported:", now]);
  rows.push(["Total Applicants in Dataset:", A.length]);
  rows.push([]);

  // ── Section 1: Pipeline Summary ────────────────────────────────────────────
  const stages = [
    "New",
    "In Progress",
    "Endorsed",
    "Hired",
    "Closed",
    "Rejected",
    "Cancelled",
  ];
  const hired = A.filter((t) => t.status === "Hired").length;
  rows.push(["=== 1. PIPELINE SUMMARY ==="]);
  rows.push(["Stage", "Count", "% of Total"]);
  stages.forEach((s) => {
    const n = A.filter((t) => t.status === s).length;
    const pct = A.length ? Math.round((n / A.length) * 100) + "%" : "—";
    rows.push([s, n, pct]);
  });
  rows.push(["TOTAL", A.length, "100%"]);
  rows.push(["Overall Hire Rate", "", _rate(hired, A.length)]);
  rows.push([]);

  // ── Section 2: Position Breakdown ─────────────────────────────────────────
  rows.push(["=== 2. POSITION BREAKDOWN ==="]);
  rows.push([
    "Position",
    "Total Applicants",
    "Hired",
    "Rejected",
    "In Progress",
    "Hire Rate",
  ]);
  const positions = [
    ...new Set(
      A.map((t) => (t.position || "").split(/[•,\n]/)[0].trim()).filter(
        Boolean,
      ),
    ),
  ].sort();
  positions.forEach((pos) => {
    const g = A.filter((t) => (t.position || "").includes(pos));
    const h = g.filter((t) => t.status === "Hired").length;
    const r = g.filter(
      (t) => t.status === "Rejected" || t.status === "Cancelled",
    ).length;
    const ip = g.length - h - r;
    rows.push([pos, g.length, h, r, ip, _rate(h, g.length)]);
  });
  rows.push([]);

  // ── Section 3: Employment Type ─────────────────────────────────────────────
  const empItems = A.flatMap((t) => _sp(t.employment_type));
  const empMap = _count(empItems);
  if (empItems.length) {
    rows.push(["=== 3. EMPLOYMENT TYPE ==="]);
    rows.push(["Type", "Count", "% of Applicants"]);
    Object.entries(empMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => rows.push([k, v, _rate(v, A.length)]));
    rows.push([]);
  }

  // ── Section 4: Work Setup ──────────────────────────────────────────────────
  const setupItems = A.flatMap((t) => _sp(t.work_setup));
  const setupMap = _count(setupItems);
  if (setupItems.length) {
    rows.push(["=== 4. PREFERRED WORK SETUP ==="]);
    rows.push(["Setup", "Count", "% of Applicants"]);
    Object.entries(setupMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => rows.push([k, v, _rate(v, A.length)]));
    rows.push([]);
  }

  // ── Section 5: Work Schedule ───────────────────────────────────────────────
  const schedItems = A.flatMap((t) => _sp(t.work_schedule));
  const schedMap = _count(schedItems);
  if (schedItems.length) {
    rows.push(["=== 5. PREFERRED WORK SCHEDULE ==="]);
    rows.push(["Schedule", "Count", "% of Applicants"]);
    Object.entries(schedMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => rows.push([k, v, _rate(v, A.length)]));
    rows.push([]);
  }

  // ── Section 6: Education Level ─────────────────────────────────────────────
  const eduMap = _count(A.map((t) => t.education_level).filter(Boolean));
  if (Object.keys(eduMap).length) {
    rows.push(["=== 6. EDUCATION LEVEL ==="]);
    rows.push(["Level", "Count", "% of Applicants"]);
    Object.entries(eduMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => rows.push([k, v, _rate(v, A.length)]));
    rows.push([]);
  }

  // ── Section 7: Applicant Sources ──────────────────────────────────────────
  const srcItems = A.flatMap((t) => _sp(t.referral_source));
  const srcMap = _count(srcItems);
  if (srcItems.length) {
    rows.push(["=== 7. HOW THEY FOUND US ==="]);
    rows.push(["Source", "Count", "% of Applicants with Source"]);
    const srcTotal = srcItems.length;
    Object.entries(srcMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => rows.push([k, v, _rate(v, srcTotal)]));
    rows.push([]);
  }

  // ── Section 8: Top Skills ──────────────────────────────────────────────────
  const skillItems = A.flatMap((t) => _sp(t.skills));
  const skillMap = _count(skillItems);
  if (skillItems.length) {
    rows.push(["=== 8. TOP SKILLS MENTIONED ==="]);
    rows.push(["Skill", "Applicants with Skill"]);
    Object.entries(skillMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([k, v]) => rows.push([k, v]));
    rows.push([]);
  }

  // ── Section 9: Top Tools ───────────────────────────────────────────────────
  const toolItems = A.flatMap((t) => _sp(t.tools));
  const toolMap = _count(toolItems);
  if (toolItems.length) {
    rows.push(["=== 9. TOP TOOLS & SOFTWARE ==="]);
    rows.push(["Tool", "Applicants with Tool"]);
    Object.entries(toolMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([k, v]) => rows.push([k, v]));
    rows.push([]);
  }

  // ── Section 10: Interview Schedule ────────────────────────────────────────
  const withSlots = A.filter(
    (t) => t.interview_slots && t.interview_slots.trim(),
  );
  if (withSlots.length) {
    rows.push(["=== 10. INTERVIEW SLOTS ==="]);
    rows.push(["Applicant", "Position", "Status", "Interview Slot(s)"]);
    withSlots.forEach((t) => {
      const slots = _sp(t.interview_slots);
      slots.forEach((slot, idx) => {
        rows.push([
          idx === 0 ? t.applicant_name || t.name || "" : "",
          idx === 0 ? t.position || "" : "",
          idx === 0 ? t.partner_status || t.status || "" : "",
          slot,
        ]);
      });
    });
    rows.push([]);
  }

  // ── Section 11: Hired Applicants ──────────────────────────────────────────
  const hiredList = A.filter((t) => t.status === "Hired");
  if (hiredList.length) {
    rows.push(["=== 11. HIRED APPLICANTS ==="]);
    rows.push([
      "Name",
      "Email",
      "Phone",
      "Position",
      "Employment Type",
      "Work Setup",
      "Date Applied",
    ]);
    hiredList.forEach((t) => {
      rows.push([
        t.applicant_name || t.name || "",
        t.applicant_email || "",
        t.applicant_phone || "",
        (t.position || "").replace(/[•\n]/g, " ").trim(),
        _sp(t.employment_type).join(", "),
        _sp(t.work_setup).join(", "),
        t.timestamp || "",
      ]);
    });
    rows.push([]);
  }

  // ── Section 12: Full Applicant Roster ─────────────────────────────────────
  rows.push(["=== 12. FULL APPLICANT ROSTER ==="]);
  rows.push([
    "Name",
    "Email",
    "Phone",
    "Address",
    "Position",
    "Stage",
    "Partner Status",
    "Employment Type",
    "Work Setup",
    "Work Schedule",
    "Education Level",
    "School",
    "Course",
    "Skills",
    "Tools",
    "Referral Source",
    "Resume Link",
    "Portfolio Link",
    "Interview Slots",
    "Notes",
    "Date Applied",
  ]);
  A.forEach((t) => {
    rows.push([
      t.applicant_name || t.name || "",
      t.applicant_email || "",
      t.applicant_phone || "",
      t.address || "",
      (t.position || "").replace(/[•\n]/g, " | ").trim(),
      t.status || "",
      t.partner_status || "",
      _sp(t.employment_type).join(", "),
      _sp(t.work_setup).join(", "),
      _sp(t.work_schedule).join(", "),
      t.education_level || "",
      t.school || "",
      t.course || "",
      _sp(t.skills).join(", "),
      _sp(t.tools).join(", "),
      _sp(t.referral_source).join(", "),
      t.resume_link || "",
      t.portfolio_link || "",
      (t.interview_slots || "").replace(/\n/g, " | "),
      (t.notes || "").replace(/\n/g, " "),
      t.timestamp || "",
    ]);
  });

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
  _renderApiCountsBanner();
}

/* ── Fetch live counts from partner API and show in analytics ── */
async function _renderApiCountsBanner() {
  const analyticsEl = document.getElementById("view-analytics");
  if (!analyticsEl) return;

  // Remove any previous banner
  const old = document.getElementById("api-counts-banner");
  if (old) old.remove();

  if (!window.UpstaffAPI || !UpstaffAPI.isConfigured()) return;

  // Insert placeholder
  const banner = document.createElement("div");
  banner.id = "api-counts-banner";
  banner.style.cssText =
    "margin:0 0 20px;padding:16px 20px;background:var(--surface-1);border:1px solid var(--border);border-radius:12px;";
  banner.innerHTML = `<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px">🔗 Live Database Counts</div>
    <div style="color:var(--muted);font-size:12px">Loading…</div>`;
  analyticsEl.prepend(banner);

  try {
    const res = await UpstaffAPI.getCounts();
    const counts = res.counts || {};
    const statusKeys = Object.keys(counts).filter((k) => k !== "total");

    banner.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px">
        🔗 Live Database Counts
        <span style="font-size:11px;font-weight:400;color:var(--muted);margin-left:8px">Total: ${counts.total || 0} applicants</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${statusKeys
          .map((s) =>
            counts[s] > 0
              ? `
          <span style="font-size:11px;padding:4px 10px;border-radius:99px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);font-weight:600">
            ${sanitize(s)}: <strong>${counts[s]}</strong>
          </span>`
              : "",
          )
          .join("")}
      </div>`;
  } catch (e) {
    banner.innerHTML = `<div style="font-size:12px;color:var(--muted)">🔗 Could not load live counts: ${sanitize(e.message)}</div>`;
  }
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
    // Re-render ApexCharts with new theme if analytics view is active
    const analyticsView = document.getElementById("view-analytics");
    if (analyticsView && analyticsView.style.display !== "none" && typeof renderAnalytics === "function") {
      renderAnalytics();
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
    container.innerHTML =
      '<div class="skeleton-list-wrap">' +
      Array(4)
        .fill('<div class="skeleton skeleton-candidate-card"></div>')
        .join("") +
      "</div>";
    requestAnimationFrame(() => {
      container.innerHTML = html;
    });
  } else {
    const folderColors = {
      "Ready to Call": "#44d7e9",
      "Ready to Hire": "#43e97b",
      "Talent Pool / Shortlisted": "#fa8231",
    };
    const _html = filtered
      .map((t) => candidateCardHTML(t, folderColors[_candidateFolderFilter]))
      .join("");
    container.innerHTML =
      '<div class="skeleton-list-wrap">' +
      Array(4)
        .fill('<div class="skeleton skeleton-candidate-card"></div>')
        .join("") +
      "</div>";
    requestAnimationFrame(() => {
      container.innerHTML = _html;
    });
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
  if (navigator.clipboard) {
    navigator.clipboard.writeText(calendarId).catch(() => {
      showCalToast("⚠️ Could not copy to clipboard.");
    });
  }
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

// Zoom integration removed.

/* ══════════════════════════════════════════════
   FILE DROPZONE DRAG-AND-DROP SETUP
══════════════════════════════════════════════ */
document.addEventListener("dragover", function (e) {
  const zone = e.target.closest("#file-dropzone, #files-drop-zone");
  if (zone) { e.preventDefault(); zone.classList.add("dragover"); }
});
document.addEventListener("dragleave", function (e) {
  const zone = e.target.closest("#file-dropzone, #files-drop-zone");
  if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove("dragover");
});
document.addEventListener("drop", function (e) {
  const zone = e.target.closest("#file-dropzone, #files-drop-zone");
  if (!zone) return;
  e.preventDefault();
  zone.classList.remove("dragover");
  const input = document.getElementById("file-attach-input");
  if (!input) return;
  const dt = new DataTransfer();
  Array.from(e.dataTransfer.files).forEach((f) => dt.items.add(f));
  input.files = dt.files;
  handleFileAttach(input);
});

// Wire up the Files tab file input
document.getElementById("file-attach-input")?.addEventListener("change", function () {
  handleFileAttach(this);
  this.value = ""; // reset so same file can be re-uploaded
});

/* ══════════════════════════════════════════════
   CLOSE NOTIF PANEL ON OUTSIDE CLICK
══════════════════════════════════════════════ */
document.addEventListener("click", function (e) {
  const panel = document.getElementById("notif-panel");
  if (!panel || !panel.classList.contains("open")) return;
  if (!e.target.closest("#notif-wrapper")) {
    if (window.gsap) {
      gsap.to(panel, { opacity: 0, y: -8, duration: 0.15, ease: "power2.in", onComplete: () => {
        panel.classList.remove("open");
        gsap.set(panel, { clearProps: "all" });
      }});
    } else {
      panel.classList.remove("open");
    }
  }
});

/* ══════════════════════════════════════════════
   TIPPY.JS — SIDEBAR ICON TOOLTIPS
   Shows tooltip labels when sidebar is collapsed.
══════════════════════════════════════════════ */
function _initSidebarTippys() {
  if (!window.tippy) return;
  const sidebar = document.getElementById("sidebar");
  const isCollapsed = sidebar?.classList.contains("collapsed");
  document.querySelectorAll(".nav-item").forEach(el => {
    // Destroy any existing instance to prevent duplicates
    if (el._tippy) el._tippy.destroy();
    const label = el.querySelector(".nav-label")?.textContent?.trim();
    if (!label) return;
    tippy(el, {
      content: label,
      placement: "right",
      theme: "upstaff",
      disabled: !isCollapsed,
      offset: [0, 10],
    });
  });
}

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", _initSidebarTippys);
} else {
  _initSidebarTippys();
}
