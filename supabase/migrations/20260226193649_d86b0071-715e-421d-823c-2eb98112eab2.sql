
ALTER TABLE public.filial_parametros
ADD COLUMN congelar_acao text NOT NULL DEFAULT 'manter',
ADD COLUMN congelar_etapa_id uuid REFERENCES public.painel_etapas(id) DEFAULT NULL;
