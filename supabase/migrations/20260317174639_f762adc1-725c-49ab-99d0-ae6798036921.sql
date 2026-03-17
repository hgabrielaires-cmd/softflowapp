
-- Add contrato_origem_id to contrato_financeiro_modulos to track which aditivo originated each module
ALTER TABLE public.contrato_financeiro_modulos
ADD COLUMN IF NOT EXISTS contrato_origem_id uuid REFERENCES public.contratos(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cfm_contrato_origem_id ON public.contrato_financeiro_modulos(contrato_origem_id);
