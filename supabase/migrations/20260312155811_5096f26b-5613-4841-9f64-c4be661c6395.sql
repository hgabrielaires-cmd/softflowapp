
ALTER TABLE public.segmentos ALTER COLUMN filial_id DROP NOT NULL;
ALTER TABLE public.segmentos ALTER COLUMN filial_id SET DEFAULT NULL;
