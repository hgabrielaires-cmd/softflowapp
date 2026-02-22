
-- Add fornecedor_id to modulos
ALTER TABLE public.modulos ADD COLUMN fornecedor_id uuid REFERENCES public.fornecedores(id);

-- Allow custos to link to modulo instead of plano
ALTER TABLE public.custos ALTER COLUMN plano_id DROP NOT NULL;
ALTER TABLE public.custos ADD COLUMN modulo_id uuid REFERENCES public.modulos(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX custos_modulo_id_unique ON public.custos(modulo_id) WHERE modulo_id IS NOT NULL;

-- Add check: must have plano_id or modulo_id
ALTER TABLE public.custos ADD CONSTRAINT custos_plano_or_modulo CHECK (plano_id IS NOT NULL OR modulo_id IS NOT NULL);
