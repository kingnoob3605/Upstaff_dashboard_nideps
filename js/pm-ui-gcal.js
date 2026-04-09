const GCAL_CONFIG = {
  // ══════════════════════════════════════════════════════════════════
  // ⚙️  DEPLOYMENT SETUP — Fill these in before going live
  // ══════════════════════════════════════════════════════════════════
  //
  // STEP 1 — Create a Google Cloud Project
  //   https://console.cloud.google.com/
  //   → New Project → Enable "Google Calendar API"
  //
  // STEP 2 — Get your API Key
  //   Google Cloud Console → APIs & Services → Credentials
  //   → Create Credentials → API Key
  //   → Restrict it to "Google Calendar API" only
  //
  API_KEY: "dsa",

  // STEP 3 — Get your OAuth 2.0 Client ID
  //   Google Cloud Console → Credentials
  //   → Create Credentials → OAuth 2.0 Client ID
  //   → Application type: Web application
  //   → Authorized JavaScript origins: add your deployed URL
  //     (e.g. https://yourdomain.com  OR  http://localhost:8080 for local)
  //
  CLIENT_ID: "dsa",
  // ══════════════════════════════════════════════════════════════════

  // Calendar IDs are discovered dynamically via gcalFetchCalendarList()
  // No hardcoding needed — calendars are fetched from the Google API.

  // How many months of events to fetch (before & after today)
  MONTHS_RANGE: 2,

  // Google API scopes — events access (read + create/update/delete events)
  SCOPES: "https://www.googleapis.com/auth/calendar.events",

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

// ── Retry utility for Google API calls ──
async function _gcalWithRetry(fn, maxRetries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.result?.error?.code || err?.status;
      const msg = err?.result?.error?.message || "";
      // Don't retry auth errors
      if (status === 401 || status === 403) {
        gcalSignedIn = false;
        localStorage.removeItem(getUserGcalAuthKey());
        showCalToast("⚠️ Google Calendar session expired — please reconnect.");
        throw err;
      }
      // Rate limit — wait before retry
      if (status === 429) {
        showCalToast(
          `⏳ Google rate limited — retrying (${attempt}/${maxRetries})…`,
        );
        await new Promise((r) => setTimeout(r, attempt * 1500));
        continue;
      }
      // Network error or 5xx — retry with backoff
      if (!status || status >= 500) {
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, attempt * 800));
          continue;
        }
      }
      break;
    }
  }
  const errMsg =
    lastErr?.result?.error?.message || lastErr?.message || "Unknown error";
  console.warn("[GCal] ❌ Failed after retries:", errMsg, lastErr);
  showCalToast(`⚠️ Google Calendar error: ${errMsg}`);
  throw lastErr;
}

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
    !GCAL_CONFIG.API_KEY ||
    !GCAL_CONFIG.CLIENT_ID ||
    GCAL_CONFIG.API_KEY === "YOUR_API_KEY_HERE" ||
    GCAL_CONFIG.CLIENT_ID === "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com"
  ) {
    console.warn(
      "[Google Calendar] ⚠️  Please fill in your API_KEY and CLIENT_ID in GCAL_CONFIG.",
    );
    const _unconfigBtn = document.getElementById("gcal-sync-btn");
    if (_unconfigBtn) {
      _unconfigBtn.title =
        "GCal not configured — add API_KEY and CLIENT_ID in js/pm-ui-gcal.js";
      _unconfigBtn.setAttribute("data-unconfigured", "true");
      _unconfigBtn.style.opacity = "0.45";
      _unconfigBtn.style.cursor = "not-allowed";
    }
    return;
  }

  gcalTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GCAL_CONFIG.CLIENT_ID,
    scope: GCAL_CONFIG.SCOPES,
    callback: (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        gcalSignedIn = true;
        localStorage.setItem(getUserGcalAuthKey(), "1");
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
          localStorage.removeItem(getUserGcalAuthKey());
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

      // ── Handle redirect-based OAuth return ──────────────────────────
      // Check if Google just redirected back with an access_token in the hash
      const redirectToken = _gcalHandleRedirectToken();
      if (redirectToken) {
        gapi.client.setToken({ access_token: redirectToken });
        updateSyncBtnState("Syncing…");
        gcalFetchCalendarList()
          .then(() => gcalFetchAllCalendars())
          .catch((err) =>
            console.warn("[GCal] ⚠️ Post-redirect fetch failed:", err),
          );
        return;
      }

      // ── Silent re-auth on page load (no popup — redirect only) ──────
      // If previously signed in, attempt a silent token refresh via redirect.
      // We skip this to avoid unexpected redirects on every page load.
      // Users must click Sync to re-authenticate after a session expires.
      const wasPreviouslySignedIn =
        localStorage.getItem(getUserGcalAuthKey()) === "1";
      if (wasPreviouslySignedIn) {
        dbg("[GCal] ℹ️ Previously signed in — click Sync to reconnect.");
        updateSyncBtnState("Sync Google Cal", false);
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

  // If resetting to neutral label and user is not signed in, show "Connect to Google" instead
  const isNeutral = label === "Sync Google Cal";
  const notSignedIn =
    !gcalSignedIn && localStorage.getItem(getUserGcalAuthKey()) !== "1";
  if (isNeutral && notSignedIn) {
    label = "Connect to Google";
  }

  if (lbl) lbl.textContent = label;
  if (btn) {
    const isConnectPrompt = label === "Connect to Google";
    const isBusy =
      label === "Connecting…" ||
      label === "Syncing…" ||
      label === "Reconnecting…";
    btn.classList.toggle("gcal-syncing", isBusy);

    if (isError) {
      btn.style.borderColor = "rgba(220,38,38,.4)";
      btn.style.color = "";
      btn.style.background = "";
    } else if (isConnectPrompt) {
      btn.style.borderColor = "rgba(66,133,244,.5)";
      btn.style.color = "#4285f4";
      btn.style.background = "rgba(66,133,244,.07)";
    } else {
      // Connected/synced state — reset to default styling
      btn.style.borderColor = "";
      btn.style.color = "";
      btn.style.background = "";
    }
  }
}

/* ──────────────────────────────────────────────
   REDIRECT-BASED OAUTH — no popup needed
   Redirects the page to Google's auth screen.
   On return, _gcalHandleRedirectToken() picks
   up the access_token from the URL hash.
────────────────────────────────────────────── */
function _gcalRedirectToAuth() {
  const redirectUri = window.location.origin + window.location.pathname;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GCAL_CONFIG.CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "token");
  url.searchParams.set("scope", GCAL_CONFIG.SCOPES);
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "select_account");
  // Save the current view so we can restore it after redirect
  try {
    sessionStorage.setItem("gcal_redirect_view", window.location.hash || "");
  } catch (_) {}
  window.location.href = url.toString();
}

/* ──────────────────────────────────────────────
   Called on page load — checks if Google just
   redirected back with an access_token in hash.
────────────────────────────────────────────── */
function _gcalHandleRedirectToken() {
  if (!window.location.hash) return false;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get("access_token");
  if (!token) return false;

  // Clean the hash from the URL immediately
  history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );

  // Apply token to gapi
  if (window.gapi && gapi.client) gapi.client.setToken({ access_token: token });
  gcalSignedIn = true;
  localStorage.setItem(getUserGcalAuthKey(), "1");

  dbg("[GCal] ✅ Got access_token from redirect flow");
  return token;
}

/* ──────────────────────────────────────────────
   SYNC BUTTON CLICK HANDLER
────────────────────────────────────────────── */
async function handleGCalSync() {
  if (!GCAL_CONFIG.API_KEY || !GCAL_CONFIG.CLIENT_ID) {
    showCalToast(
      "⚠️ Google Calendar is not set up yet. Open js/pm-ui-gcal.js and fill in your API_KEY and CLIENT_ID to enable sync.",
    );
    return;
  }

  // Dismiss any previous popup-blocked banner
  const prevBanner = document.getElementById("gcal-popup-banner");
  if (prevBanner) prevBanner.remove();

  if (!gcalSignedIn) {
    // Use GIS popup flow (COOP header fixed via netlify.toml — popups work)
    if (gcalTokenClient) {
      updateSyncBtnState("Connecting…");
      gcalTokenClient.requestAccessToken({ prompt: "select_account" });
    } else {
      // GIS not loaded yet — fall back to redirect flow
      updateSyncBtnState("Redirecting to Google…");
      _gcalRedirectToAuth();
    }
  } else {
    updateSyncBtnState("Syncing…");
    await gcalFetchAllCalendars();
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
    const resp = await _gcalWithRetry(() =>
      gapi.client.calendar.calendarList.list({
        minAccessRole: "reader",
      }),
    );
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

    localStorage.setItem(
      getUserCalendarsKey(),
      JSON.stringify(UPSTAFF_CALENDARS),
    );
    dbg(
      `[GCal] 📋 Discovered ${UPSTAFF_CALENDARS.length} calendar(s):`,
      UPSTAFF_CALENDARS.map((c) => c.icon + " " + c.calendarName).join(", "),
    );

    populateCalendarSelectors();
    renderCalendarSidebar();
    return UPSTAFF_CALENDARS;
  } catch (err) {
    const msg = err?.result?.error?.message || "";
    if (!msg)
      showCalToast(
        "⚠️ Could not load Google Calendars. Check your connection.",
      );
    console.warn("[GCal] ⚠️ Could not fetch calendar list:", msg || err);
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
    localStorage.setItem(
      getUserCalendarsKey(),
      JSON.stringify(UPSTAFF_CALENDARS),
    );
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
    localStorage.setItem(
      getUserCalendarsKey(),
      JSON.stringify(UPSTAFF_CALENDARS),
    );
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

    // Re-inject interview_slots after GCal sync so slot-derived events
    // are not wiped out by gcalInjectEvents (which clears gcalSyncedIds).
    if (
      typeof TASKS !== "undefined" &&
      typeof injectInterviewSlotsAsEvents === "function"
    ) {
      injectInterviewSlotsAsEvents(TASKS);
    }

    localStorage.setItem(getUserGcalCountKey(), String(totalCount));

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
      localStorage.removeItem(getUserGcalAuthKey());
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
   INJECT INTERVIEW SLOTS AS CALENDAR EVENTS
   Reads task.interview_slots (text from Google Sheet col 15) and
   adds each slot as a pseudo-event in calEvents so it shows on the
   calendar and counts in analytics — WITHOUT touching Google Calendar.

   Format handled (from Apps Script buildRow):
     "• Jan 15, 2024 @ 2:30 PM\n• Jan 16, 2024 @ 10:00 AM"
     "• 2024-01-15 @ 09:00\n• 2024-01-16 @ 14:00"

   Duplicate prevention:
     Slots are keyed by "taskId|date|time" so re-syncing is safe.
────────────────────────────────────────────── */
const _slotEventIds = new Set(); // tracks slot-derived event IDs across refreshes

function injectInterviewSlotsAsEvents(tasks) {
  // Remove previously injected slot events (clean re-inject on every sync)
  calEvents = calEvents.filter((e) => !e._fromSlot);
  _slotEventIds.clear();

  (tasks || []).forEach((task) => {
    const raw = task.interview_slots;
    if (!raw || !raw.trim()) return;

    // Split by newline — each line is one slot
    const lines = raw
      .split(/\n/)
      .map((l) => l.replace(/^[•\-]\s*/, "").trim())
      .filter(Boolean);

    lines.forEach((line) => {
      // Try to parse "DATE @ TIME" pattern
      // Handles: "Jan 15, 2024 @ 2:30 PM" | "2024-01-15 @ 09:00" | "Jan 15, 2024 @ 09:00 AM"
      const atIdx = line.indexOf("@");
      if (atIdx === -1) return;

      const datePart = line.slice(0, atIdx).trim();
      const timePart = line.slice(atIdx + 1).trim();

      let parsedDate = "";
      try {
        const d = new Date(datePart);
        if (isNaN(d.getTime())) return;
        const pad = (n) => String(n).padStart(2, "0");
        parsedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      } catch (_) {
        return;
      }

      // Normalise time to HH:MM (24-hour)
      let parsedTime = "09:00";
      const timeMatch = timePart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        let h = parseInt(timeMatch[1], 10);
        const m = timeMatch[2];
        const meridian = (timeMatch[3] || "").toUpperCase();
        if (meridian === "PM" && h < 12) h += 12;
        if (meridian === "AM" && h === 12) h = 0;
        parsedTime = `${String(h).padStart(2, "0")}:${m}`;
      }

      // Build a stable ID — prevents duplicates on re-sync
      const _stableKey = task.supabase_id || task.applicant_email || String(task.id);
      const slotKey = `slot_${_stableKey}_${parsedDate}_${parsedTime}`;
      const numericId = 80000 + Math.abs(hashStr(slotKey));
      if (_slotEventIds.has(numericId)) return;

      // Skip if an identical Google Calendar event already covers this slot
      // (matches by task id linkage or same applicant name + same date)
      const alreadyCovered = calEvents.some(
        (e) =>
          !e._fromSlot &&
          e.date === parsedDate &&
          (e.taskId === task.id ||
            (e.applicant_name || e.name || "").toLowerCase() ===
              (task.applicant_name || task.name || "").toLowerCase()),
      );
      if (alreadyCovered) return;

      _slotEventIds.add(numericId);
      calEvents.push({
        id: numericId,
        _fromSlot: true, // marker so we can remove on re-sync
        taskId: task.id,
        // Canonical event fields
        title: task.applicant_name || task.name || "Interview",
        name: task.applicant_name || task.name || "Interview",
        applicant_name: task.applicant_name || task.name || "",
        position: task.position || "",
        interview_stage: "Interview Slot",
        date: parsedDate,
        time: parsedTime,
        start_time: parsedTime,
        end_time: autoEndTime(parsedTime),
        status: "Scheduled",
        type: "Interview",
        round: "Interview Slot",
        interviewer: "",
        notes: `Interview slot from applicant's submitted preferences.\nRaw: ${line}`,
        isGoogleEvent: false,
        sourceCalendar: "interview_slots",
        calendarId: "interview_slots",
      });
    });
  });

  dbg(
    `[Slots] Injected ${_slotEventIds.size} interview slot event(s) from task data`,
  );
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
      if (task && task.status !== "Closed" && task.status !== "Cancelled" && task.status !== "Hired") {
        moveApplicantToStage(task.id, "Closed");
        changed = true;
        dbg(
          `[GCalSync] 🔄 Task "${task.name}" closed because GCal event was cancelled.`,
        );
        showToast(
          `📅 "${task.name}" closed — interview cancelled in Google Calendar.`,
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
  const lastCount = localStorage.getItem(getUserGcalCountKey());
  const wasSignedIn = localStorage.getItem(getUserGcalAuthKey()) === "1";
  if (wasSignedIn && lastCount) {
    updateSyncBtnState(`Last synced (${lastCount})`);
    document.getElementById("gcal-status-badge").style.display = "flex";
    document.getElementById("gcal-status-text").textContent =
      `${lastCount} events — reconnecting…`;
  } else if (!wasSignedIn) {
    // Not connected — prompt the manager to connect
    const btn = document.getElementById("gcal-sync-btn");
    const lbl = document.getElementById("gcal-btn-label");
    if (lbl) lbl.textContent = "Connect to Google";
    if (btn) {
      btn.style.borderColor = "rgba(66,133,244,.5)";
      btn.style.color = "#4285f4";
      btn.style.background = "rgba(66,133,244,.07)";
    }
  }

  // GIS script is loaded in the HTML head — wait for it to be ready then init
  function _initGIS() {
    if (window.google && google.accounts && google.accounts.id) {
      google.accounts.id.initialize({
        client_id: GCAL_CONFIG.CLIENT_ID,
        callback: window.handleGoogleSignIn || function () {},
        auto_select: false,
      });
      google.accounts.id.renderButton(document.querySelector(".g_id_signin"), {
        theme: "filled_black",
        size: "large",
        shape: "pill",
        text: "sign_in_with",
      });
    }
  }
  if (window.google && google.accounts) {
    _initGIS();
  } else {
    // GIS loaded with async defer — poll briefly until ready (max ~2s)
    let _gisAttempts = 0;
    const _gisTimer = setInterval(() => {
      _gisAttempts++;
      if (window.google && google.accounts) {
        clearInterval(_gisTimer);
        _initGIS();
      } else if (_gisAttempts > 20) {
        clearInterval(_gisTimer);
        console.warn("[GCal] Could not load GIS script — offline or blocked?");
        if (wasSignedIn) updateSyncBtnState("Offline — local events only", true);
      }
    }, 100);
  }

  // Init Calendar API (gapi is loaded synchronously in HTML head — always ready)
  gcalInit();

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
