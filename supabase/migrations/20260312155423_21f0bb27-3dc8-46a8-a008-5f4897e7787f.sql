
ALTER TABLE public.crm_oportunidades 
ADD COLUMN segmento_id uuid REFERENCES public.segmentos(id) ON DELETE SET NULL DEFAULT NULL;
