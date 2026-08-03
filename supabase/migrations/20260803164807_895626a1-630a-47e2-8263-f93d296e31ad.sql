ALTER TABLE public.fin_despesas ADD COLUMN IF NOT EXISTS filial_id uuid REFERENCES public.filiais(id);
CREATE INDEX IF NOT EXISTS idx_fin_despesas_filial_id ON public.fin_despesas(filial_id);