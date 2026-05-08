/* ══════════════════════════════════════════════
   [SECTION: BOARD-VIEW] — Drag & Drop Kanban
   ──────────────────────────────────────────────
   Extracted from pm-ui-views.js. Depends on globals:
     TASKS, ACTIVE_STAGES, CLOSED_STATUSES, OTHERS_STATUSES,
     STATUS_META, TERMINAL_STAGES, PRIORITY_COLORS, STAGE_ORDER,
     _sortables, _dragTaskId, selectedTaskIds,
     autoProgressStatuses, dueCls, avatarColor, getNextStage,
     fmtDue, sanitize, initials, statusPillClass,
     openTaskEdit, openTaskNew, moveApplicantToStage,
     advanceToNextStage, hireApplicant, rejectApplicant, toggleBulkSelect
   All defined in pm-ui-core.js or pm-ui-views.js (load order:
     pm-ui-core.js → pm-ui-views.js → pm-ui-board.js)
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
            ${t.interview_date ? `<div style="margin-top:4px;"><span style="font-size:10px;font-family:'Montserrat',sans-serif;font-weight:600;color:var(--cyan);padding:2px 6px;background:rgba(62,207,223,.12);border-radius:99px;white-space:nowrap;">🗓 Interview: ${fmtDue(t.interview_date)}</span></div>` : ""}
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
