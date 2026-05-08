/* ══════════════════════════════════════════════════════════════════════
   pm-ui-list.js — LIST VIEW (extracted from pm-ui-views.js, Week 3)

   Owns:
     • renderList(), renderListStatusTabs(), getListFilters()
     • setListStatusTab(), listPageChange(), cycleSort()
     • clearListFilter(), clearAllListFilters(), clearAllFilters()
     • clearCalFilter(), clearCalFilters(), updateFilterBadge(), updateCalFilterBadge()
     • toggleSuperFilter(), toggleCalFilterBar()
     • Action menu: buildListActionMenuHTML(), toggleListActionMenu(),
                   _lamOutsideClick(), closeAllListMenus()
     • listAdvanceStage(), listRevertStage(), getPrevStage()
     • listScheduleInterview(), listRejectApplicant(),
       listCancelApplicant(), listDeleteApplicant()
     • populateListPositionFilter()

   State (script-scope):
     • listActiveStatus, listCurrentPage, LIST_PAGE_SIZE, PRIORITY_ORDER

   Depends on globals from pm-ui-core.js & pm-ui-views.js:
     TASKS, calEvents, STATUS_META, STAGE_ORDER, ACTIVE_STAGES,
     LIST_STATUS_ORDER, OTHERS_STATUSES, TERMINAL_STAGES,
     PRIORITY_COLORS, JOB_POSITIONS,
     dueCls, fmtDue, fmtTime, fmtDate, sanitize, avatarColor, initials,
     statusPillClass, autoProgressStatuses, advanceToNextStage,
     moveApplicantToStage, openTaskNew, openTaskEdit, openNewAt,
     persistSave, refreshCurrentView, closeTaskModal, switchView,
     showToast, uiConfirm, toggleBulkSelect, selectedTaskIds,
     renderCalendar, _supabaseDeleteTask, UpstaffAPI

   Load order: pm-ui-core → pm-ui-views → pm-ui-list → pm-ui-board
   ══════════════════════════════════════════════════════════════════════ */

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
    dateFrom: document.getElementById("list-filter-date-from")?.value || "",
    dateTo: document.getElementById("list-filter-date-to")?.value || "",
    sort: document.getElementById("list-sort")?.value || "due-asc",
  };
}

function _getActiveView() {
  return document.querySelector(".view-tab.active")?.dataset.view || "list";
}

function toggleSuperFilter() {
  // In calendar view, redirect to the inline cal filter bar
  if (_getActiveView() === "calendar") { toggleCalFilterBar(); return; }
  const panel = document.getElementById("super-filter-panel");
  const btn   = document.getElementById("topbar-filter-btn");
  if (!panel) return;
  const isOpen = panel.style.display !== "none";
  if (isOpen) {
    panel.style.display = "none";
    btn.classList.remove("active");
    return;
  }
  document.getElementById("sf-list-section").style.display = "";
  document.getElementById("sf-cal-section").style.display  = "none";
  panel.style.display = "";
  btn.classList.add("active");
}

function toggleCalFilterBar() {
  const bar = document.getElementById("cal-filter-bar");
  const btn = document.getElementById("cal-filter-btn");
  if (!bar) return;
  const open = bar.style.display !== "none";
  bar.style.display = open ? "none" : "";
  if (btn) btn.style.background = open ? "" : "var(--surface-3, var(--surface-2))";
}

function updateFilterBadge() {
  const f = getListFilters();
  const count = [f.priority, f.position, f.assignee, f.dateFrom, f.dateTo].filter(Boolean).length;
  const badge  = document.getElementById("filter-active-badge");
  const clearBtn = document.getElementById("super-filter-clear-btn");
  if (badge)    { badge.textContent = count; badge.style.display = count ? "" : "none"; }
  if (clearBtn) clearBtn.style.display = count ? "" : "none";
}

function updateCalFilterBadge() {
  const cal    = document.getElementById("cal-filter-calendar")?.value || "";
  const pos    = document.getElementById("cal-filter-position")?.value  || "";
  const status = document.getElementById("cal-filter-status")?.value    || "";
  const type   = document.getElementById("cal-filter-type")?.value      || "";
  const from   = document.getElementById("cal-filter-date-from")?.value || "";
  const to     = document.getElementById("cal-filter-date-to")?.value   || "";
  const count  = [cal, pos, status, type, from, to].filter(Boolean).length;
  const badge       = document.getElementById("filter-active-badge");
  const toolbarBadge= document.getElementById("cal-toolbar-filter-badge");
  const clearBtn    = document.getElementById("cal-filter-clear-btn");
  const tagsEl      = document.getElementById("cal-active-filter-tags");
  if (badge)        { badge.textContent = count; badge.style.display = count ? "" : "none"; }
  if (toolbarBadge) { toolbarBadge.textContent = count; toolbarBadge.style.display = count ? "" : "none"; }
  if (clearBtn)     clearBtn.style.display = count ? "" : "none";
  // Show active filter tags below cal toolbar
  if (tagsEl) {
    const labels = [
      cal    && { key: "cal",    label: `Calendar: ${cal}` },
      pos    && { key: "pos",    label: `Position: ${pos}` },
      status && { key: "status", label: `Status: ${status}` },
      type   && { key: "type",   label: `Type: ${type}` },
      from   && { key: "from",   label: `From: ${from}` },
      to     && { key: "to",     label: `To: ${to}` },
    ].filter(Boolean);
    tagsEl.style.display = labels.length ? "" : "none";
    tagsEl.innerHTML = labels.map(t =>
      `<span class="list-filter-tag" onclick="clearCalFilter('${t.key}')">${sanitize(t.label)}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </span>`
    ).join("");
  }
}

function clearCalFilter(key) {
  const map = { cal:"cal-filter-calendar", pos:"cal-filter-position", status:"cal-filter-status", type:"cal-filter-type", from:"cal-filter-date-from", to:"cal-filter-date-to" };
  const el = document.getElementById(map[key]);
  if (el) el.value = "";
  updateCalFilterBadge();
  renderCalendar();
}

function clearCalFilters() {
  ["cal-filter-calendar","cal-filter-position","cal-filter-status","cal-filter-type","cal-filter-date-from","cal-filter-date-to"].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = "";
  });
  updateCalFilterBadge();
  renderCalendar();
}

function clearAllFilters() {
  ["list-filter-priority","list-filter-position","list-filter-assignee","list-filter-date-from","list-filter-date-to"].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = "";
  });
  updateFilterBadge();
  renderList();
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
    if (f.dateFrom && t.due && t.due < f.dateFrom) return false;
    if (f.dateTo && t.due && t.due > f.dateTo) return false;
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
                    let intDateHTML = t.interview_date
                      ? `<div class="list-int-cell list-int-upcoming"><span class="list-int-date">${fmtDue(t.interview_date)}</span></div>`
                      : `<span class="list-int-none">—</span>`;
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
    renderList();
    return;
  }
  if (key === "status") {
    // Status now lives on the .list-status-tab pill row, not a <select>.
    setListStatusTab("all");
    return; // setListStatusTab triggers renderList()
  }
  const el = document.getElementById(`list-filter-${key}`);
  if (el) el.value = "";
  renderList();
}
function clearAllListFilters() {
  [
    "list-filter-priority",
    "list-filter-position",
    "list-filter-assignee",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const s = document.getElementById("list-search");
  if (s) s.value = "";
  // Reset the status tab pill row (no <select> for it anymore)
  if (typeof setListStatusTab === "function") {
    setListStatusTab("all");
  } else {
    renderList();
  }
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
      if (idx !== -1) { window._supabaseDeleteTask && _supabaseDeleteTask(t.id); TASKS.splice(idx, 1); }
      showToast(`🗑️ ${name} deleted.`);
    } catch (e) {
      showToast(`⚠️ Delete failed: ${e.message}`);
      return; // Do not remove locally if API delete failed
    }
  } else {
    // Local-only applicant — safe to remove immediately
    if (idx !== -1) { window._supabaseDeleteTask && _supabaseDeleteTask(t.id); TASKS.splice(idx, 1); }
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
