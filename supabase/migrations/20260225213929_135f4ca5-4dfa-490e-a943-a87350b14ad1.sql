
-- Change usuario_id to usuario_ids (UUID array) to support multiple users per alert level
ALTER TABLE public.painel_etapa_alertas 
  ADD COLUMN usuario_ids UUID[] DEFAULT '{}';

-- Migrate existing data
UPDATE public.painel_etapa_alertas 
  SET usuario_ids = ARRAY[usuario_id] 
  WHERE usuario_id IS NOT NULL;

-- Drop old column
ALTER TABLE public.painel_etapa_alertas 
  DROP COLUMN usuario_id;
