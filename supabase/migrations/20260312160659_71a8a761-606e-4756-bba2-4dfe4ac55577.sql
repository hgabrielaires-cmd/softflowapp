
ALTER TABLE public.crm_oportunidades ADD COLUMN segmento_ids uuid[] DEFAULT '{}';
-- Migrate existing data
UPDATE public.crm_oportunidades SET segmento_ids = ARRAY[segmento_id] WHERE segmento_id IS NOT NULL;
-- Drop old column
ALTER TABLE public.crm_oportunidades DROP COLUMN segmento_id;
