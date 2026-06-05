# Upstaff — Interview Pipeline Dashboard

A role-based HR recruitment dashboard for managing applicants through an interview pipeline. Built with vanilla JavaScript — no build step, no framework.

---

## What This System Does

Upstaff is an internal HR tool that lets HR managers and assistants track job applicants from first contact through to hire. It replaces spreadsheet-based tracking with a structured, real-time pipeline interface backed by Supabase.

**Core features:**
- **List View** — sortable, filterable table of all applicants with inline status, priority, position, and assignee
- **Board View** — Kanban-style drag-and-drop pipeline by stage
- **Calendar View** — month/week/day calendar showing scheduled interviews
- **Table View** — dense data grid for bulk review
- **Applicant Profiles** — full candidate record: contact info, scores, links, notes, documents, activity log, comments
- **Assessment Scores** — typing, knowledge, verbal, grammar, data entry, formatting, sorting
- **Google Calendar Integration** — sync interview events to Google Calendar
- **Role-Based Access** — `hr` role has full access; `assistant` role has restricted view
- **Invite System** — HR can invite assistants by email with 7-day expiring tokens
- **Dark / Light Mode** — persistent theme toggle
- **Saved Views** — quick filter presets (My applicants, This week, Stale ≥7d, Unassigned)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML + CSS + JavaScript (no framework) |
| Backend / Database | [Supabase](https://supabase.com) (PostgreSQL + Auth) |
| Authentication | Supabase email/password with role-based profiles |
| Deployment | Vercel |
| Calendar | Google Calendar API (via `gapi`) |
| Email | EmailJS |

### CDN Libraries (no npm, no build step)

| Library | Purpose |
|---|---|
| `@supabase/supabase-js` v2 | Database client + auth |
| `gsap` v3 | UI animations |
| `sortablejs` | Drag-and-drop board columns |
| `apexcharts` | Analytics charts |
| `cropperjs` | Avatar image cropping |
| `tippy.js` | Tooltips |
| `@emailjs/browser` | Email notifications |

---

## Project Structure

```
/
├── index.html              # Single-page app entry point
├── css/
│   ├── pm-ui-base.css      # Design tokens, layout, core components
│   ├── pm-ui-components.css # Feature-specific components
│   ├── pm-ui-calendar.css  # Calendar view styles
│   └── pm-ui-glass.css     # Glassmorphism / overlay styles
├── js/
│   ├── supabase-auth.js    # Auth module (login, session, roles)
│   ├── pm-ui-api.js        # Supabase data layer (CRUD for applicants)
│   ├── pm-ui-core.js       # Shared utilities (debounce, sanitize, validation)
│   ├── pm-ui-views.js      # View switching, layout rendering
│   ├── pm-ui-list.js       # List view + filter logic
│   ├── pm-ui-board.js      # Board / Kanban view
│   ├── pm-ui-calendar.js   # Calendar view
│   └── pm-ui-assess.js     # Assessment scoring UI
└── vercel.json             # Vercel deployment config
```

---

## Supabase Database Schema

### `public.applicants` — main data table (45 rows)

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | Auto-increment |
| `applicant_name` | text | |
| `applicant_email` | text | nullable |
| `applicant_phone` | text | nullable |
| `status` | text | Pipeline stage (New, For Interview, Interviewed, etc.) |
| `priority` | text | Low / Medium / High / Urgent |
| `position` | text | Job role applied for |
| `assignee` | text | Assigned HR/assistant |
| `interview_date` | date | nullable |
| `application_date` | date | nullable |
| `followup_date` | date | nullable |
| `education_level` | text | nullable |
| `skills` / `tools` | text | nullable |
| `resume_link` | text | nullable |
| `typing_score` / `knowledge_score` / etc. | text | Assessment scores |
| `gcal_event_id` | text | Linked Google Calendar event |
| `stage_history` | jsonb | Array of stage change timestamps |
| `activity` | jsonb | Activity log entries |
| `comments` | jsonb | Comment thread |
| `attachments` | jsonb | File attachment references |
| `archived` | boolean | default false |
| `partner_status` | text | External partner pipeline status |

### `public.profiles` — user accounts

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | References `auth.users` |
| `role` | text | `hr` or `assistant` |
| `name` | text | Display name |
| `email` | text | nullable |
| `avatar_url` | text | nullable |
| `status` | text | `active`, `invited`, or `suspended` |
| `invited_by` | uuid | FK → profiles.id |

### `public.invites` — invite tokens

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `email` | text | Invitee email |
| `role` | text | `hr` or `assistant` |
| `accepted` | boolean | default false |
| `expires_at` | timestamptz | default now() + 7 days |

### `public.employees` — employee records

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | |
| `data` | jsonb | Flexible employee data blob |

### `public.config` — app configuration

| Column | Type | Notes |
|---|---|---|
| `key` | text PK | Config key |
| `value` | text | Config value |

All tables have **Row Level Security (RLS) enabled**.

---

## Environment Variables

Create a `.env` file in the project root (never commit this):

```env
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

The Supabase URL and anon key are configured via the in-app settings panel (stored in `localStorage` under key `upstaff_api_config`), not via `.env`.

---

## Local Development

No build step required. Serve the root directory with any static file server:

```bash
# Using npx serve
npx serve -p 3000 .

# Using Python
python -m http.server 3000

# Using VS Code Live Server
# Right-click index.html → Open with Live Server
```

Then open `http://localhost:3000`.

---

## Deployment (Vercel)

The project deploys as a static site on Vercel. No build command needed.

```
Framework Preset: Other
Build Command: (leave empty)
Output Directory: . (root)
```

---

## User Roles

| Role | Access |
|---|---|
| `hr` | Full access — add/edit/delete applicants, invite users, view all data |
| `assistant` | Read + limited edit — cannot delete, cannot invite, restricted fields hidden |

Roles are assigned by an admin in the Supabase `profiles` table. Users cannot self-assign roles.

---

## Authentication Flow

1. User visits app → auth gate hides UI until session resolves
2. Supabase checks for existing session in localStorage
3. If no session → login overlay shown
4. On login → `profiles` table queried for role
5. Role applied to `body.role-hr` or `body.role-assistant` → CSS hides/shows role-gated elements
6. Session persists across page refreshes via Supabase localStorage token
