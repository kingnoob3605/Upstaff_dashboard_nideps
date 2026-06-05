# Upstaff — Recruitment Pipeline Dashboard

Internal HR dashboard for managing applicants through the full hiring pipeline. Tracks applicants from initial screening to hire, with Kanban board, calendar, list, and table views.

---

## What This System Does

- **Applicant tracking** — create, update, and move applicants through pipeline stages
- **Multiple views** — List, Board (Kanban), Calendar, Table
- **Role-based access** — `hr` role has full access; `assistant` role has limited access
- **Filter & search** — filter by position, assignee, priority, due date; quick search by name
- **Assessments** — record typing scores, grammar scores, knowledge scores, verbal links
- **Google Calendar integration** — sync interview dates to Google Calendar
- **Email notifications** — follow-up reminders via EmailJS
- **Saved views** — pin custom filter combinations (My applicants, This week, Stale ≥7d, Unassigned)
- **Dark / light mode** — persisted per user

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML + CSS + JavaScript (no framework) |
| Auth & Database | [Supabase](https://supabase.com) (PostgreSQL + Auth) |
| Calendar Sync | Google Calendar API (via `gapi`) |
| Email | EmailJS |
| Charts | ApexCharts (CDN) |
| Drag & Drop | SortableJS (CDN) |
| Animation | GSAP (CDN) |
| Image Crop | CropperJS (CDN) |
| Deployment | Vercel |

---

## File Structure

```
upstaff-dashboard/
├── index.html                  # App shell — single HTML file, loads all scripts/styles
│
├── js/
│   ├── supabase-auth.js        # Auth module — Supabase login, session, role detection
│   ├── pm-ui-core.js           # Shared utilities — sanitize, debounce, form validation
│   ├── pm-ui-api.js            # Google Apps Script API client (partner data fetch)
│   ├── pm-ui-views.js          # View switcher, applicant card renderer, modal logic
│   ├── pm-ui-list.js           # List view — render, filter popover, sort, pagination
│   ├── pm-ui-board.js          # Board (Kanban) view — columns, drag-and-drop
│   ├── pm-ui-assess.js         # Assessment panel — score entry and display
│   ├── pm-ui-gcal.js           # Google Calendar — OAuth, event create/update/delete
│   └── Cropper.js              # Image cropper library (local copy)
│
├── css/
│   ├── pm-ui-base.css          # Design tokens, CSS variables, layout, typography
│   ├── pm-ui-components.css    # UI components — buttons, modals, filter popover, badges
│   ├── pm-ui-calendar.css      # Calendar view styles
│   └── pm-ui-glass.css         # Glass morphism surface effects
│
├── .env                        # Environment variables (not committed — see Setup)
├── .gitignore
├── vercel.json                 # Vercel deployment config
└── _headers                    # HTTP security headers
```

---

## Supabase Database Schema

### `public.applicants` — main table (45+ rows)

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | Auto-increment |
| `applicant_name` | text | Required |
| `applicant_email` | text | |
| `applicant_phone` | text | |
| `address` | text | |
| `status` | text | Pipeline stage (New, For Interview, Interviewed, For Client Endorsement, Hired, etc.) |
| `priority` | text | Low / Medium / High / Urgent |
| `position` | text | Job position applied for |
| `assignee` | text | Primary assignee name |
| `assignees` | jsonb | Array of assignee names |
| `application_date` | date | |
| `interview_date` | date | Used for Google Calendar sync |
| `followup_date` | date | Follow-up reminder date |
| `employment_type` | text | Full-time / Part-time / Contract |
| `work_setup` | text | Remote / Onsite / Hybrid |
| `resume_link` | text | |
| `portfolio_link` | text | |
| `video_intro_link` | text | |
| `drive_folder_link` | text | Google Drive folder link |
| `notes` | text | General notes |
| `interview_notes` | text | Notes from interview |
| `typing_score` | text | Assessment score |
| `knowledge_score` | text | Assessment score |
| `grammar_score` | text | Assessment score |
| `verbal_link` | text | Link to verbal assessment recording |
| `conflict_score` | text | Assessment score |
| `data_entry_score` | text | Assessment score |
| `formatting_score` | text | Assessment score |
| `sorting_score` | text | Assessment score |
| `gcal_event_id` | text | Google Calendar event ID |
| `hired_at` | timestamptz | |
| `rejected_at` | timestamptz | |
| `rejection_reason` | text | |
| `stage_history` | jsonb | Array of `{stage, changed_at}` |
| `activity` | jsonb | Activity log entries |
| `comments` | jsonb | Comment thread |
| `attachments` | jsonb | File attachment metadata |
| `archived` | boolean | Soft delete flag |
| `partner_status` | text | Partner endorsement status |
| `updated_at` | timestamptz | Auto-updated |

### `public.profiles` — user accounts

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | References `auth.users.id` |
| `role` | text | `hr` or `assistant` |
| `name` | text | |
| `email` | text | |
| `avatar_url` | text | |
| `status` | text | `active`, `invited`, or `suspended` |
| `invited_by` | uuid | FK → profiles.id |
| `created_at` | timestamptz | |
| `last_seen_at` | timestamptz | |

### `public.invites`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `email` | text | Invitee email |
| `role` | text | `hr` or `assistant` |
| `name` | text | |
| `invited_by` | uuid | FK → profiles.id |
| `accepted` | boolean | |
| `expires_at` | timestamptz | 7 days from creation |

### `public.employees`

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `data` | jsonb | Employee record blob |
| `updated_at` | timestamptz | |

### `public.config`

| Column | Type | Notes |
|---|---|---|
| `key` | text PK | Config key |
| `value` | text | Config value |

> All tables have **Row Level Security (RLS) enabled**.

---

## Environment Variables

Create a `.env` file in the project root (never commit this file):

```env
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

Supabase URL and anon key are configured in-app via the settings panel (stored in `localStorage` under key `upstaff_api_config`). Default fallback values are embedded in `js/supabase-auth.js`.

---

## Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/kingnoob3605/Upstaff_dashboard_nideps.git
cd Upstaff_dashboard_nideps

# 2. Create .env with your Google API credentials (see above)

# 3. Serve locally — any static server works
npx serve .
# or
python -m http.server 3000
```

Open `http://localhost:3000` and log in with a Supabase user that has a matching `profiles` row with role `hr` or `assistant`.

---

## How Auth Works

1. User enters email + password on the login screen
2. `supabase-auth.js` calls `supabase.auth.signInWithPassword()`
3. On success, fetches the `profiles` row for that user's UUID
4. Role (`hr` / `assistant`) is stored in the session — controls which UI elements are visible
5. `html.auth-pending` class is removed → app content is revealed
6. Session persists via Supabase's built-in token refresh

---

## Pipeline Stages

```
New → For Interview → Interviewed → For Client Endorsement → Hired
                                                           ↘ Closed / Rejected
```

`Hired` and `Hired - Resigned` are terminal stages (excluded from overdue counts).

---

## Deployment

Deployed on **Vercel**. Push to `main` branch triggers auto-deploy. Config in `vercel.json`.
