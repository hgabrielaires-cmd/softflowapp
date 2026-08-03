ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS plano_conta_id uuid REFERENCES public.fin_plano_contas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fornecedores_plano_conta_id ON public.fornecedores(plano_conta_id);