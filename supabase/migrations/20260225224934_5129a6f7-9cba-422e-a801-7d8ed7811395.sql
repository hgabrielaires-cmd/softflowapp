-- Drop the old unique constraint that doesn't include filial_id
ALTER TABLE public.painel_etapa_alertas DROP CONSTRAINT IF EXISTS painel_etapa_alertas_etapa_id_canal_nivel_key;

-- Create new unique constraint including filial_id
ALTER TABLE public.painel_etapa_alertas ADD CONSTRAINT painel_etapa_alertas_etapa_canal_nivel_filial_key UNIQUE (etapa_id, canal, nivel, filial_id);