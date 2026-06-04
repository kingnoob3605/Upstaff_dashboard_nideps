# Upstaff Dashboard — SPEC

## §I. Architecture

### I.auth
- Supabase client init: lazy `_getClient()` → `window.supabase.createClient()` → creds from `localStorage["upstaff_api_config"]`
- Default project URL: `https://pbabqydgzgrciqzidugd.supabase.co`
- SDK calls ∈ `supabase-auth.js` only
- REST calls (raw fetch) ∈ `pm-ui-core.js` → `Authorization: Bearer <token>` + `apikey` headers

### I.sync
- `persistSave()` → `localStorage["upstaff_tasks"]` → `_syncDebounced()` → `_supabaseSyncNow()` (2s debounce)
- `_supabaseSyncNow()`: POST `/rest/v1/applicants` (upsert), POST `/rest/v1/cal_events`, POST `/rest/v1/employees`
- `loadDataFromSupabase()`: GET `/rest/v1/applicants?select=id,data`, GET `/rest/v1/employees?select=id,data`, GET `/rest/v1/cal_events?select=id,data` → replaces TASKS in memory → `persistSave()`

### I.api (Apps Script)
- URL stored in `localStorage["upstaff_api_config"].webAppUrl` — ! hardcoded ⊥
- Legacy mode: POST → `webAppUrl`, `Content-Type: text/plain`, body = JSON string `{action, token, email, ...}`
- Edge proxy mode (preferred): POST → `edgeProxyUrl`, `Authorization: Bearer <supabaseToken>`; active when `c.useEdgeProxy === true && c.edgeProxyUrl` set

---

## §II. Data Model

### II.task — TASKS array
- Declared: `pm-ui-core.js:733`
- Persisted: `localStorage["upstaff_tasks"]`

Full shape:

```
id                  integer (taskNextId++)
name                string
applicant_name      string
status              pipeline stage string
priority            "Low"|"Medium"|"High"|"Urgent"
position            string
assignees           string[]
assignee            string (legacy, first assignee)
start               YYYY-MM-DD
due                 YYYY-MM-DD
notes               string
candidateFolder     string?
gcalEventId         string|null
applicant_email     string
applicant_phone     string
address             string
employment_type     string
work_setup          string
work_schedule       string
education_level     string
school              string
course              string
skills              string
tools               string
interview_slots     string (newline-separated)
supabase_id         string (partner UUID)
referral_source     string
resume_link         URL
portfolio_link      URL
video_intro_link    URL
other_docs_link     URL
drive_folder_link   URL
application_date    YYYY-MM-DD
interview_date      YYYY-MM-DD
followup_date       YYYY-MM-DD
followup_notified   string
typing_score        string
word_typing         string
knowledge_score     string
verbal_link         URL
conflict_score      string
grammar_score       string
data_entry_score    string
formatting_score    string
sorting_score       string
interview_notes     string
hired_at            ISO string | ""
rejected_at         ISO string | ""
archived            boolean
stage_changed_at    ISO string
comments            array
activity            array
attachments         array
stage_history       [{from,to,at,by}]
rejection_reason    string
-- API-sourced only:
_source             "api"
partner_status      string
timestamp           string
referral_code       string
```

### II.supabase-tables

```
applicants:   id integer PK | data jsonb | updated_at timestamptz
cal_events:   id integer PK | data jsonb | updated_at timestamptz
employees:    id integer PK | data jsonb | updated_at timestamptz
profiles:     id uuid PK → auth.users | role text CHECK('hr','assistant') | name text | email? | avatar_url?
config:       key text | value text
audit_log:    id bigserial PK | user_id uuid → auth.users | action text | detail jsonb | ip text | ts timestamptz
```

config rows: `apps_script_url`, `admin_email`, `admin_password`, `gcal_api_key`, `gcal_client_id`, `emailjs_service_id`, `emailjs_template_id`, `emailjs_public_key`, `search_api_key`

---

## §III. Key Functions

| fn | file | line | role |
|---|---|---|---|
| `_getClient()` | `supabase-auth.js` | 40 | lazy Supabase client init |
| `persistSave()` | `pm-ui-core.js` | 801 | save TASKS → LS + trigger sync |
| `persistLoad()` / `loadData()` | `pm-ui-core.js` | 848 | load LS, migrate shape, purge API tasks |
| `loadDataFromSupabase()` | `pm-ui-core.js` | 1022 | fetch all tables → replace TASKS |
| `_supabaseSyncNow()` | `pm-ui-core.js` | 953 | upsert applicants/cal_events/employees |
| `_supabaseDeleteTask()` | `pm-ui-core.js` | 1136 | DELETE `/rest/v1/applicants?id=eq.<id>` |
| `_supabaseDeleteCalEvent()` | `pm-ui-core.js` | 1149 | DELETE `/rest/v1/cal_events?id=eq.<id>` |
| `_autoCreateEmployee()` | `pm-ui-core.js` | 1419 | on "Hired" → create employees row |
| save handler | `pm-ui-views.js` | 2582 | btn-task-save click → build t → persist |
| `openTaskEdit()` | `pm-ui-views.js` | 1960 | load task → populate f-* fields |
| `syncApplicantsFromApi()` | `pm-ui-views.js` | 1177 | pull Apps Script → merge local state |
| `sheetImportSearch()` | `pm-ui-views.js` | 5703 | search Apps Script for pre-fill |
| `sheetImportFill()` | `pm-ui-views.js` | 5801 | fill modal from sheet row |
| `listDeleteApplicant()` | `pm-ui-list.js` | 970 | confirm → API delete → Supabase delete |
| `syncStatusToApi()` | `pm-ui-api.js` | 650 | guard: `_source==="api"` & `supabase_id` & role=hr |

---

## §IV. Form Fields (Applicant Modal)

| id | type | maps to |
|---|---|---|
| `f-name` | text | `applicant_name` |
| `f-email` | email | `applicant_email` |
| `f-phone` | tel | `applicant_phone` |
| `f-address` | text | `address` |
| `f-position` | select | `position` |
| `f-app-date` | date | `application_date` |
| `f-interview-date` | date | `interview_date` |
| `f-followup-date` | date | `followup_date` |
| `f-employment-type` | select | `employment_type` |
| `f-work-setup` | select | `work_setup` |
| `f-work-schedule` | select | `work_schedule` |
| `f-referral-source` | select | `referral_source` |
| `f-interview-slots` | text | `interview_slots` |
| `f-supabase-id` | text | `supabase_id` |
| `f-education-level` | select | `education_level` |
| `f-school` | text | `school` |
| `f-course` | text | `course` |
| `f-skills` | textarea | `skills` |
| `f-tools` | textarea | `tools` |
| `f-resume` | url | `resume_link` |
| `f-portfolio` | url | `portfolio_link` |
| `f-video-intro` | url | `video_intro_link` |
| `f-other-docs` | url | `other_docs_link` |
| `f-drive-folder` | url | `drive_folder_link` |
| `f-notes` | textarea | `notes` |
| `f-typing-score` | text | `typing_score` |
| `f-word-typing` | text | `word_typing` |
| `f-knowledge-score` | number | `knowledge_score` |
| `f-verbal-link` | url | `verbal_link` |
| `f-conflict-score` | number | `conflict_score` |
| `f-grammar-score` | number | `grammar_score` |
| `f-data-entry-score` | number | `data_entry_score` |
| `f-formatting-score` | number | `formatting_score` |
| `f-sorting-score` | number | `sorting_score` |
| `f-interview-notes` | textarea | `interview_notes` |
| `f-status` | select | `status` |
| `f-priority` | select | `priority` |
| `f-folder` | select | `candidateFolder` |
| `f-start` | date | `start` |
| `f-due` | date | `due` |
| `f-task-gcal-sync` | checkbox | GCal sync toggle |

---

## §V. Invariants

```
V1: ∀ Supabase write from frontend → via raw REST, NOT SDK (except profiles)
V2: syncStatusToApi guard: t._source === "api" & t.supabase_id truthy & role = "hr" & cfg.token present
V3: ∀ "Hired" → _autoCreateEmployee() fires; dedup by source_task_id | name
V4: employees table ⊥ auto-created → ! manual SQL setup
V5: syncApplicantsFromApi disabled at startup (commented out); manual "Sync Now" only
V6: ∀ table ∈ public schema → RLS enabled (confirmed: applicants, cal_events, employees, profiles, config)
V7: `service_role` key ⊥ frontend exposure
V8: `raw_user_meta_data` ⊥ used in RLS/auth decisions → use `raw_app_meta_data`
```

---

## §VI. Migration Status

```
/supabase/migrations/20260508_audit_log.sql  — only existing migration
applicants, cal_events, employees, profiles, config — no SQL migration files; inferred from code
```

Current tables live (confirmed via MCP list_tables):
- `public.profiles` RLS ✓, 0 rows
- `public.config` RLS ✓, 0 rows
- `public.applicants` RLS ✓, 9 rows
- `public.cal_events` RLS ✓, 33 rows
- `public.employees` RLS ✓, 0 rows

---

## §VII. Key Files

| file | role |
|---|---|
| `js/supabase-auth.js` | auth, profiles CRUD, config fetch, JWT |
| `js/pm-ui-core.js` | TASKS, persist, REST sync, delete, loadFromSupabase, autoCreateEmployee |
| `js/pm-ui-api.js` | Apps Script client, mapApplicant, syncStatusToApi |
| `js/pm-ui-views.js` | save (2582), openTaskEdit (1960), syncApplicantsFromApi (1177), sheetImport (5703) |
| `js/pm-ui-list.js` | listDeleteApplicant (970) |
| `index.html` | all f-* form fields (1613–2015) |
| `supabase/migrations/20260508_audit_log.sql` | audit_log schema |
| `supabase/functions/apps-script-proxy/index.ts` | Edge Fn: secure Apps Script proxy |
| `supabase/functions/invite-user/index.ts` | Edge Fn: HR-only invitations |
| `2MAINappscript.txt` | Apps Script source; sheet column schema |

---

## §B. Bugs

| id | date | severity | cause | fix |
|---|---|---|---|---|
| B01 | 2026-06-04 | High | `t.assignee` (string) checked in search; field is `t.assignees` (array) → multi-assignee never matches | `(t.assignees\|\|[]).some(a => a?.toLowerCase().includes(f.search))` in `pm-ui-list.js:350` |
| B02 | 2026-06-04 | High | `ageBadgeHTML(t)` called in `pm-ui-list.js:545` but ⊥ defined anywhere → runtime crash | Define in `pm-ui-core.js` |
| B03 | 2026-06-04 | High | Save handler ⊥ clears modal → old field values persist on new/re-open. Resume/CV Link removed → save → reopen → link reappears. Root: empty fields not written as `""` to Supabase upsert | In save handler (`pm-ui-views.js:2582`): explicitly set cleared fields to `""` before `persistSave()`. In `_taskToRow()`: write `|| ""` for all URL fields, not `|| null` |
| B04 | 2026-06-04 | Medium | URL input fields (`f-resume`, `f-portfolio`, `f-video-intro`, `f-other-docs`, `f-drive-folder`) show validation error on blank → fields ! optional. `type="url"` browser validation fires on empty string | Remove `type="url"` → use `type="text"` + custom URL validator only when non-empty. Or add `pattern` that allows blank. |
| B05 | 2026-06-04 | Medium | Date parse: `new Date("YYYY-MM-DD")` → UTC midnight → shifts ±1 day in non-UTC zones | Use `new Date(y, m-1, d)` for local midnight ∀ date fields |
| B06 | 2026-06-04 | Medium | `loadDataFromSupabase()` no try/catch → `_supabaseLoading` stays `true` ∀ network fail → UI hangs | Wrap in try/catch; set `_supabaseLoading=false`; show error toast |
| B07 | 2026-06-04 | High | Reminder timer (60s): `minutesUntil` threshold `±1 min` → double-fire at boundary | Change threshold to `±0.5 min` in `pm-ui-gcal.js:1460` |

---

## §T. Tasks

| id | status | task | cites |
|---|---|---|---|
| T01 | . | Fix save handler: write empty string for cleared URL fields → Supabase upsert | B03 |
| T02 | . | Fix URL fields: optional when blank, no browser validation error | B04 |
| T03 | . | Define `ageBadgeHTML()` in `pm-ui-core.js` | B02 |
| T04 | . | Fix assignee search: array `.some()` check | B01 |
| T05 | . | Interview slot revamp: 3 date options (1 primary, 2 alternates) replacing free-text `f-interview-slots` | §IV |
| T06 | . | Fix date parse: `new Date(y,m-1,d)` local midnight ∀ date fields | B05 |
| T07 | . | Fix `loadDataFromSupabase()`: add try/catch, reset loading flag, show error toast | B06 |
| T08 | . | Add DB indexes: `applicants(status, position, application_date, assignee)` | audit |
| T09 | . | Add NOT NULL to `applicant_name`, `status`, `priority` columns | audit |
| T10 | . | Deprecate `pm-ui-api.js` entirely; remove `syncApplicantsFromApi()` dead path | audit |
