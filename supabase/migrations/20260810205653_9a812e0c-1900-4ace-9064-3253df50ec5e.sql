ALTER TABLE public.message_templates
  ADD COLUMN IF NOT EXISTS meta_template_type text,
  ADD COLUMN IF NOT EXISTS meta_template_name text,
  ADD COLUMN IF NOT EXISTS meta_template_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS meta_language text DEFAULT 'pt_BR',
  ADD COLUMN IF NOT EXISTS meta_buttons jsonb NOT NULL DEFAULT '[]'::jsonb;