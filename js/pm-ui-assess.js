/* ══════════════════════════════════════════════
   ASSESSMENT PORTAL INTEGRATION
   ──────────────────────────────────────────────
   Bridge between pm-ui and the external assessment
   portal (voicetest.html) developed by the friend.

   Extracted from pm-ui-views.js. Depends on globals:
     TASKS, taskEditId, showToast, dbg, _refreshScoreSummary
   All defined in pm-ui-views.js — load order:
     pm-ui-views.js → pm-ui-assess.js
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
      bar
        .querySelectorAll(".assess-tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".assess-panel")
        .forEach((p) => (p.style.display = "none"));
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
  bar
    .querySelectorAll(".assess-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".assess-panel")
    .forEach((p) => (p.style.display = "none"));
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
    _fill("f-typing-score", r.typing_score || "");
    _fill("f-word-typing", r.word_typing || "");
    _fill("f-knowledge-score", r.knowledge_score || "");
    // Verbal Test
    _fill("f-verbal-link", r.verbal_link || "");
    _fill("f-conflict-score", r.conflict_score || "");
    _fill("f-grammar-score", r.grammar_score || "");
    // Excel Test
    _fill("f-data-entry-score", r.data_entry_score || "");
    _fill("f-formatting-score", r.formatting_score || "");
    _fill("f-sorting-score", r.sorting_score || "");
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
