-- Coach framework fields
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS framework_input_type TEXT CHECK (framework_input_type IN ('voice','text')),
  ADD COLUMN IF NOT EXISTS framework_raw_text TEXT,
  ADD COLUMN IF NOT EXISTS framework_voice_memo_path TEXT,
  ADD COLUMN IF NOT EXISTS framework_bullets JSONB,
  ADD COLUMN IF NOT EXISTS framework_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS framework_generate_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS framework_generate_date DATE;
