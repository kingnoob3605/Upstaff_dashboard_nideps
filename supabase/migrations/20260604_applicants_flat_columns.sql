-- Migration: flatten applicants table from jsonb blob to structured columns
-- Previous schema: { id integer PK, data jsonb, updated_at timestamptz }
-- New schema: one column per field, matching the JS task object and form fields

-- ── 1. Add all new columns ─────────────────────────────────────────────────
ALTER TABLE applicants
  -- Personal Information
  ADD COLUMN IF NOT EXISTS applicant_name     text,
  ADD COLUMN IF NOT EXISTS applicant_email    text,
  ADD COLUMN IF NOT EXISTS applicant_phone    text,
  ADD COLUMN IF NOT EXISTS address            text,

  -- Application Information
  ADD COLUMN IF NOT EXISTS status             text,
  ADD COLUMN IF NOT EXISTS priority           text,
  ADD COLUMN IF NOT EXISTS position           text,
  ADD COLUMN IF NOT EXISTS assignee           text,
  ADD COLUMN IF NOT EXISTS assignees          jsonb    DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS application_date   date,
  ADD COLUMN IF NOT EXISTS interview_date     date,
  ADD COLUMN IF NOT EXISTS followup_date      date,
  ADD COLUMN IF NOT EXISTS followup_notified  text,
  ADD COLUMN IF NOT EXISTS employment_type    text,
  ADD COLUMN IF NOT EXISTS work_setup         text,
  ADD COLUMN IF NOT EXISTS work_schedule      text,
  ADD COLUMN IF NOT EXISTS referral_source    text,
  ADD COLUMN IF NOT EXISTS interview_slots    text,
  ADD COLUMN IF NOT EXISTS supabase_id        text,

  -- Education
  ADD COLUMN IF NOT EXISTS education_level    text,
  ADD COLUMN IF NOT EXISTS school             text,
  ADD COLUMN IF NOT EXISTS course             text,

  -- Skills & Tools
  ADD COLUMN IF NOT EXISTS skills             text,
  ADD COLUMN IF NOT EXISTS tools              text,

  -- Links
  ADD COLUMN IF NOT EXISTS resume_link        text,
  ADD COLUMN IF NOT EXISTS portfolio_link     text,
  ADD COLUMN IF NOT EXISTS video_intro_link   text,
  ADD COLUMN IF NOT EXISTS other_docs_link    text,
  ADD COLUMN IF NOT EXISTS drive_folder_link  text,

  -- Notes
  ADD COLUMN IF NOT EXISTS notes              text,
  ADD COLUMN IF NOT EXISTS interview_notes    text,

  -- Assessment scores
  ADD COLUMN IF NOT EXISTS typing_score       text,
  ADD COLUMN IF NOT EXISTS word_typing        text,
  ADD COLUMN IF NOT EXISTS knowledge_score    text,
  ADD COLUMN IF NOT EXISTS verbal_link        text,
  ADD COLUMN IF NOT EXISTS conflict_score     text,
  ADD COLUMN IF NOT EXISTS grammar_score      text,
  ADD COLUMN IF NOT EXISTS data_entry_score   text,
  ADD COLUMN IF NOT EXISTS formatting_score   text,
  ADD COLUMN IF NOT EXISTS sorting_score      text,
  ADD COLUMN IF NOT EXISTS candidate_folder   text,

  -- Pipeline / system fields
  ADD COLUMN IF NOT EXISTS gcal_event_id      text,
  ADD COLUMN IF NOT EXISTS hired_at           timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at        timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason   text,
  ADD COLUMN IF NOT EXISTS stage_changed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS archived           boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS stage_history      jsonb    DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS activity           jsonb    DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS comments           jsonb    DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS attachments        jsonb    DEFAULT '[]';

-- ── 2. Migrate existing jsonb blob data to flat columns ────────────────────
UPDATE applicants
SET
  applicant_name    = data->>'applicant_name',
  applicant_email   = data->>'applicant_email',
  applicant_phone   = data->>'applicant_phone',
  address           = data->>'address',
  status            = data->>'status',
  priority          = data->>'priority',
  position          = data->>'position',
  assignee          = data->>'assignee',
  assignees         = COALESCE(data->'assignees', '[]'::jsonb),
  application_date  = NULLIF(data->>'application_date', '')::date,
  interview_date    = NULLIF(data->>'interview_date',   '')::date,
  followup_date     = NULLIF(data->>'followup_date',    '')::date,
  followup_notified = data->>'followup_notified',
  employment_type   = data->>'employment_type',
  work_setup        = data->>'work_setup',
  work_schedule     = data->>'work_schedule',
  referral_source   = data->>'referral_source',
  interview_slots   = data->>'interview_slots',
  supabase_id       = data->>'supabase_id',
  education_level   = data->>'education_level',
  school            = data->>'school',
  course            = data->>'course',
  skills            = data->>'skills',
  tools             = data->>'tools',
  resume_link       = data->>'resume_link',
  portfolio_link    = data->>'portfolio_link',
  video_intro_link  = data->>'video_intro_link',
  other_docs_link   = data->>'other_docs_link',
  drive_folder_link = data->>'drive_folder_link',
  notes             = data->>'notes',
  interview_notes   = data->>'interview_notes',
  typing_score      = data->>'typing_score',
  word_typing       = data->>'word_typing',
  knowledge_score   = data->>'knowledge_score',
  verbal_link       = data->>'verbal_link',
  conflict_score    = data->>'conflict_score',
  grammar_score     = data->>'grammar_score',
  data_entry_score  = data->>'data_entry_score',
  formatting_score  = data->>'formatting_score',
  sorting_score     = data->>'sorting_score',
  candidate_folder  = data->>'candidateFolder',
  gcal_event_id     = data->>'gcalEventId',
  hired_at          = NULLIF(data->>'hired_at',          '')::timestamptz,
  rejected_at       = NULLIF(data->>'rejected_at',       '')::timestamptz,
  rejection_reason  = data->>'rejection_reason',
  stage_changed_at  = NULLIF(data->>'stage_changed_at',  '')::timestamptz,
  archived          = COALESCE((data->>'archived')::boolean, false),
  stage_history     = COALESCE(data->'stage_history', '[]'::jsonb),
  activity          = COALESCE(data->'activity',       '[]'::jsonb),
  comments          = COALESCE(data->'comments',       '[]'::jsonb),
  attachments       = COALESCE(data->'attachments',    '[]'::jsonb)
WHERE data IS NOT NULL;

-- ── 3. Drop the old jsonb blob column ──────────────────────────────────────
ALTER TABLE applicants DROP COLUMN IF EXISTS data;
